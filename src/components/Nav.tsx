"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { SparkleBurst } from "./Sparkles";
import { ParticleWordmark } from "./ParticleWordmark";

const LINKS = [
  { href: "/", label: "home" },
  { href: "/projects", label: "projects" },
  { href: "/press", label: "press" },
  { href: "/socials", label: "socials" },
];

const SMALL_PX = 18.4; // 1.15rem

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [heroPx, setHeroPx] = useState(112);
  const [burstId, setBurstId] = useState(0);
  const didMount = useRef(false);

  useEffect(() => {
    // Polls window.scrollY directly every frame instead of reacting to
    // `scroll` events at all. Two earlier approaches both failed on this:
    // a bare `scrollY > 80` cutoff flapped on any wobble near that pixel,
    // and debouncing until scrolling went fully quiet made the header lag
    // behind real scrolling entirely — a continuous trackpad/momentum
    // scroll can keep firing `scroll` events with no gap for a while, so
    // "wait for quiet" never got a chance to fire, leaving the large,
    // transparent-backed header sitting over page content that had already
    // scrolled up underneath it. Polling sidesteps the `scroll` event
    // system altogether (however a given browser batches or throttles its
    // dispatch, e.g. Chrome vs Safari, becomes irrelevant — this never
    // reads event payloads, only the live scroll position each frame), so
    // it's exactly as responsive as scrolling itself. Hysteresis (enter at
    // 80, exit below 40) is kept alongside it purely to stop the boundary
    // itself from flapping on a single frame's worth of noise.
    //
    // MIN_SCROLLABLE guards against a real feedback loop this doesn't fix
    // on its own: the header is `sticky`, so it still occupies space in
    // document flow, and its own height shrinks by ~28px when `scrolled`
    // flips true (pb-10 -> pb-3). That height change alters the page's
    // total scroll range. On a short page (little content — /socials was
    // the confirmed case, ~194px of scroll room), shrinking the header
    // lowers the max scroll position enough that the browser auto-clamps
    // scrollY back down below EXIT, which grows the header back, which
    // restores the max scroll and lets scrollY climb back past ENTER
    // again — a genuine self-sustaining bounce, not noise, reproduced
    // directly (scrollY and header height both oscillating continuously).
    // Pages with real content never get close enough to the boundary for
    // this to matter. Below MIN_SCROLLABLE, the shrink transition is
    // disabled outright — a page that short doesn't need the space-saving
    // shrink anyway, so there's no downside to just not attempting it.
    const ENTER = 80;
    const EXIT = 40;
    const MIN_SCROLLABLE = 240;
    let raf = 0;
    let isScrolled = false;
    const tick = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const next = maxScroll < MIN_SCROLLABLE ? false : isScrolled ? window.scrollY > EXIT : window.scrollY > ENTER;
      if (next !== isScrolled) {
        isScrolled = next;
        setScrolled(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const calc = () => setHeroPx(Math.min(116, Math.max(48, window.innerWidth * 0.09)));
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    setBurstId((id) => id + 1);
  }, [scrolled]);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-border/70 bg-background/75 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <nav
        className={`mx-auto flex max-w-5xl items-end justify-between gap-6 px-6 transition-[padding] duration-500 ease-out sm:px-8 ${
          scrolled ? "pb-3" : "pb-10"
        }`}
      >
        <Link href="/" className="relative inline-block">
          <SparkleBurst burstId={burstId} />
          <ParticleWordmark lines={["mana", "jampala"]} fontSize={scrolled ? SMALL_PX : heroPx} />
        </Link>

        <div className="flex items-center gap-6 pb-1.5">
          <ul className="flex items-center gap-5 text-[14px] text-muted">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`relative transition-colors hover:text-foreground ${
                      active ? "text-foreground" : ""
                    }`}
                  >
                    {link.label}
                    <span
                      className={`absolute -bottom-1 left-0 h-px bg-accent transition-all duration-300 ${
                        active ? "w-full" : "w-0"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
