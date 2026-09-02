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
  const headerRef = useRef<HTMLElement>(null);

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
    // The header is `sticky` (still occupies flow space) and its height
    // drops by ~230-240px when `scrolled` flips true — not the ~28px of
    // padding (pb-10 -> pb-3) an earlier fix assumed, but the wordmark's two
    // `font-display` lines collapsing from heroPx (~116) to 18.4px inside
    // that flow. Losing that much height above the fold caused the header to
    // flap between states right at the switch point, via two separate
    // mechanisms:
    //
    //   1. Chrome/Firefox scroll anchoring shifting scrollY to "compensate"
    //      for the size change, shoving it back and forth across ENTER/EXIT.
    //      Fixed in CSS with `overflow-anchor: none` on <html> — see
    //      globals.css. (Safari has no scroll anchoring; this was the
    //      "Chrome-only glitch" from earlier commits.)
    //
    //   2. On a short page (/socials), collapsing the header shortens the
    //      document below the user's scrollY, so the browser clamps scrollY
    //      to the new bottom — potentially past EXIT, which grows the header
    //      back. The `canShrink` guard below handles this one: only allow
    //      the shrink when there's enough scroll room that collapsing by the
    //      *measured* shrink amount still leaves scrollY (~ENTER at the
    //      crossing) clear of EXIT. It's evaluated only while the header is
    //      expanded (!isScrolled) — a stable reading — and frozen while
    //      scrolled so the collapse can never retract itself. An earlier
    //      guard compared the *live* maxScroll (itself a function of the
    //      header's current height) against a fixed 240, which just moved
    //      the same feedback loop down a level.
    const ENTER = 80;
    const EXIT = 40;
    const SETTLE_MARGIN = 40; // room to spare beyond the header's own shrink
    let raf = 0;
    let isScrolled = false;
    let canShrink = true;
    let expandedH = 0; // header offsetHeight sampled while expanded
    let collapsedH = 0; // ... and while collapsed
    const tick = () => {
      const h = headerRef.current?.offsetHeight ?? 0;
      if (isScrolled) collapsedH = h;
      else expandedH = h;
      const shrinkDelta = expandedH && collapsedH ? Math.max(0, expandedH - collapsedH) : 0;

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (!isScrolled) {
        // Before the shrink amount has been measured once, fall back to a
        // generous fixed floor (comfortably above /socials' scroll room,
        // well below any page that actually needs the space-saving shrink).
        const needed = shrinkDelta ? ENTER + shrinkDelta + SETTLE_MARGIN : 400;
        canShrink = maxScroll >= needed;
      }

      const next = !canShrink ? false : isScrolled ? window.scrollY > EXIT : window.scrollY > ENTER;
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
      ref={headerRef}
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
