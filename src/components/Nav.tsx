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
    // The header is `sticky` (still occupies flow space) and its height
    // drops by ~230-240px when `scrolled` flips true — the wordmark's two
    // `font-display` lines collapsing from heroPx (~116) to 18.4px, not the
    // ~28px of padding (pb-10 -> pb-3) that alone would suggest. Losing that
    // much height above the fold caused the header to flap between states
    // right at the switch point, via two separate mechanisms:
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
    //      back, which restores the room, which lets scrollY climb past
    //      ENTER again. MIN_SCROLLABLE below guards this: don't allow the
    //      shrink at all unless there's a big enough margin that collapsing
    //      can't push the remaining room below EXIT.
    //
    //      This used to be measured live via headerRef.offsetHeight
    //      (actual expanded/collapsed height, sampled each frame) instead of
    //      a constant — which sounds more precise but wasn't: a sample taken
    //      mid-spring (while the header is still animating between sizes,
    //      not settled) could freeze canShrink against a wrong number, and
    //      unlike ENTER/EXIT that freeze is easy to get stuck the wrong way
    //      permanently, since canShrink only ever re-evaluates while
    //      unscrolled. A fixed constant, comfortably above the header's own
    //      known shrink amount, can't be thrown off by animation timing.
    const ENTER = 80;
    const EXIT = 40;
    const MIN_SCROLLABLE = 320;
    // Force an INSTANT jump to the top on every page change, rather than
    // trusting Next.js's own default scroll-to-top-on-navigation. The global
    // `scroll-behavior: smooth` on <html> (see globals.css) makes that
    // default animate instead of jump — and that animation was getting
    // interrupted by the header's own layout shift partway through (a
    // genuine chicken-and-egg: the first tick below sees the OLD page's
    // still-high scrollY before the smooth-scroll has finished, shrinks the
    // header, and that shrink's reflow cancels the in-progress smooth
    // scroll, leaving it stranded above EXIT forever — reproduced directly,
    // it was settling around scrollY 56 instead of 0). An instant jump here
    // means the tick loop below always starts from a real, settled 0.
    window.scrollTo({ top: 0, behavior: "instant" });
    let raf = 0;
    let isScrolled = false;
    let canShrink = true;
    // On a fresh page (this effect just re-ran because pathname changed),
    // the `scrolled` REACT STATE can still be left over from the PREVIOUS
    // page (eg. true/small from /socials) while `isScrolled`, the local var
    // that drives change-detection below, always restarts at its own
    // default of false. If those two happen to already agree numerically
    // (both computing "false" on the very first tick), `next !== isScrolled`
    // is false, so setScrolled is never called — and the stale React state
    // is what actually stays on screen, since the local var agreeing with
    // itself doesn't mean it agrees with what React is still rendering.
    // Forcing a sync on the first tick regardless of whether the computed
    // value "changed" closes that gap.
    let firstTick = true;
    const tick = () => {
      // Only re-evaluated while expanded — deliberately never using the
      // COLLAPSED state's (smaller) maxScroll to decide this, which would
      // let a page that could shrink safely at the top talk itself back out
      // of it once already collapsed (canShrink flips false again, which
      // forces `next = true` regardless of scrollY — permanently stuck
      // small, unable to re-expand even scrolled all the way up).
      if (!isScrolled) {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        canShrink = maxScroll >= MIN_SCROLLABLE;
      }

      // Fall back to the SMALL state, not large, when the page can't safely
      // support the shrink transition. The header is sticky (stays pinned
      // while scrolling) — forcing it to stay large on a page too short to
      // shrink means that large header permanently occupies a big share of
      // the little space available, and scrolling even slightly runs page
      // content up underneath/behind it. Small takes up little enough space
      // that this can't happen, and a content-light page doesn't need the
      // big hero moment anyway.
      const next = !canShrink ? true : isScrolled ? window.scrollY > EXIT : window.scrollY > ENTER;
      if (next !== isScrolled || firstTick) {
        isScrolled = next;
        setScrolled(next);
        firstTick = false;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Re-runs on every route change on purpose. Nav lives in the shared
    // layout, so it never remounts between client-side page navigations —
    // without `pathname` here, canShrink/expandedH/collapsedH/isScrolled
    // would be measured ONCE on first mount and then persist unchanged for
    // the entire session, regardless of which page's content they're
    // actually being evaluated against. Concretely: visit a page short
    // enough that canShrink freezes false (eg. /socials), then navigate
    // anywhere else client-side, and the header would stay stuck small on
    // every subsequent page forever — canShrink only ever gets a chance to
    // re-evaluate while `!isScrolled`, but isScrolled was also frozen true,
    // so nothing could ever unstick it. Each page's scroll geometry is
    // different and needs to be measured fresh.
  }, [pathname]);

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
