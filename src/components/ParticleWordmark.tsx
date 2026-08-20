"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

type Particle = {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  wakeAt: number; // performance.now() timestamp before which the particle ignores all forces
};

// Sampling grid spacing, css px. Reverted from 3 back to 2 — dialing this
// down for performance reintroduced a coverage gap elsewhere on the "j"
// (the upper hook, not just the tail this had been verified against). The
// batched single-fill() call was the actual performance win; this density
// is what coverage correctness actually needs.
const STEP = 2;
const INK_MARGIN_PX = 3; // how far beyond each sampling cell's own bounds to also check for ink
// Low enough to catch faint anti-aliased strokes — verified against a
// direct pixel-diff of the full rendered word against the real text, not
// just the swash. Bodoni Moda's italic has multiple thin decorative
// flourishes (eg. a connecting stroke between "n" and "a"), any of which
// can fall below a threshold tuned only against the "j".
const INK_ALPHA_THRESHOLD = 12;
const REPEL_RADIUS = 46;
const REPEL_STRENGTH = 1.4;
const SPRING = 0.05; // interactive spring once a particle has settled in — snappy repel/return
const ENTRANCE_SPRING = 0.017; // slower spring while a particle is still arriving — graceful assembly
const ENTRANCE_WINDOW_MS = 620; // how long after waking a particle uses the slower entrance spring
const EXIT_SPRING = 0.015; // slow spring while dissolving back to text — unhurried gather-home
const DAMPING = 0.8;
const DOT_RADIUS = 1.15;
const SETTLE_MIN_MS = 350; // minimum gather + color-sweep time before the crossfade may start
const SETTLE_MAX_MS = 1400; // safety cap — crossfade starts even if something never fully converges
const SETTLE_EPSILON_PX = 2.5; // how close to home counts as "arrived" for exit-convergence purposes
const BURST_JITTER = 22; // px of random scatter around the cursor's entry point
const WAKE_STAGGER_MS = 220; // spread of entrance delays across particles
// How far each particle starts from its own home, as a fraction of the way
// back toward the cursor's entry point (0 = starts at home, 1 = starts fully
// at the entry point). Starting fully at the entry point looks great for
// nearby letters but means anything far away (eg. the "j" swash when you
// enter near "mana") has a long way to fly — if you glance at it before that
// finishes, it reads as permanently incomplete rather than mid-animation.
// Blending shortens the trip for distant particles without losing the
// "assembling from where you hovered" feel for nearby ones.
const ENTRY_PULL = 0.55;
const CROSSFADE_MS = 550;
const CROSSFADE_EASE = [0.4, 0, 0.2, 1] as const; // smooth, evenly-paced ease — not front-loaded
// Fraction of the crossfade window spent resolving the scattered dots into
// a perfect solid raster (see rasterRef below). Deliberately short — the
// point is to get to a gap-free image fast and hold it there while the
// whole canvas fades out into the real text.
const SOLIDIFY_FRACTION = 0.35;

// Checks every pixel in a STEP-sized block, not just its corner — a fixed
// sampling grid can otherwise straddle a thin curved stroke (eg. the tight
// little terminal loop on Bodoni Moda's italic "j") and miss it entirely if
// no exact grid point happens to land on it. Also expands the checked area
// by `margin` px on every side ("dilated") beyond the cell's own bounds —
// canvas's text shaping doesn't always land pixel-for-pixel where the DOM's
// does for every thin decorative stroke (eg. a connecting flourish between
// two letters), and this catches ink a few px outside a cell's own
// territory rather than requiring the two renderers to agree exactly.
function blockHasInk(
  data: Uint8ClampedArray,
  stride: number,
  x0: number,
  y0: number,
  size: number,
  maxX: number,
  maxY: number,
  threshold: number,
  margin: number,
) {
  const xStart = Math.max(0, x0 - margin);
  const yStart = Math.max(0, y0 - margin);
  const xEnd = Math.min(x0 + size + margin, maxX);
  const yEnd = Math.min(y0 + size + margin, maxY);
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      if (data[(y * stride + x) * 4 + 3] > threshold) return true;
    }
  }
  return false;
}

function hexToRgb(hex: string) {
  const clean = hex.trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function lerpColor(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
  return `rgb(${Math.round(a.r + (b.r - a.r) * t)}, ${Math.round(a.g + (b.g - a.g) * t)}, ${Math.round(a.b + (b.b - a.b) * t)})`;
}

// Smoothstep — a simple, cheap ease-in-out for the hand-driven canvas fade.
function easeInOut(t: number) {
  return t * t * (3 - 2 * t);
}

// Guards against building particles from a font-size that's still mid-spring
// (or a web font that hasn't finished loading yet) — hovering right after
// page load can otherwise sample a completely wrong size, producing a
// mismatched, broken-looking particle shape for the rest of that hover.
function waitForStableFontSize(textEl: HTMLElement, targetPx: number, maxWaitMs: number): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const check = () => {
      const current = parseFloat(getComputedStyle(textEl).fontSize);
      if (Math.abs(current - targetPx) < 1 || performance.now() - start > maxWaitMs) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

/**
 * Renders text normally, but on hover it bursts into a field of dots
 * (colored with --accent) that fly outward from the cursor's entry point,
 * settle into the letterforms with a staggered spring, and scatter away
 * from the cursor as it moves. On mouseleave the dots gather home slowly,
 * sweep from pink to the real text color, then dissolve-crossfade into
 * crisp text.
 */
export function ParticleWordmark({
  lines,
  fontSize,
  className = "",
}: {
  lines: string[];
  fontSize: number;
  className?: string;
}) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  // A retina-resolution, fully anti-aliased rendering of the current text —
  // the exact same fillText() call the particle grid is sampled from, kept
  // around (not discarded) so the exit animation can draw it directly
  // instead of relying on the particle grid to reconstruct the letterform.
  // The particle grid is a sparse point-sample of this image; it's great for
  // a scattering dot effect but was never guaranteed to have zero gaps at
  // every thin stroke, and every gap it did have showed up right as it
  // resolved into "solid" — exactly where it's most noticeable. Drawing the
  // real image instead of the reconstruction removes that whole bug class.
  const rasterRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  // getComputedStyle forces a style recalc, and hex parsing is needless
  // string work — both are real, avoidable cost done 60x/sec if repeated
  // every frame. Theme colors don't change mid-hover in any normal case, so
  // read + parse them once per hover session instead.
  const colorsRef = useRef<{ accent: { r: number; g: number; b: number }; foreground: { r: number; g: number; b: number } } | null>(
    null,
  );
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveStartRef = useRef<number | null>(null);
  const crossfadeStartedRef = useRef(false);
  // The canvas's own fade in/out is driven by hand (ctx.globalAlpha, applied
  // every frame in the same loop that already drives everything else)
  // instead of a native CSS opacity transition. A CSS transition hands the
  // fade off to the browser's own compositing pipeline, which is the one
  // part of this whole effect not under direct control — driving it
  // manually removes that as a variable entirely rather than guessing at
  // what a given browser's compositor might be doing with it.
  const enterStartRef = useRef<number | null>(null);
  const crossfadeStartTimeRef = useRef<number | null>(null);
  const enterTokenRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  // entry is wrapper-relative (0,0 = real text's own top-left) — the canvas
  // itself moves around (see PAD below), so anchoring to the wrapper instead
  // keeps this correct regardless of where the canvas ends up positioned.
  const buildParticles = (entryWrapper: { x: number; y: number } | null) => {
    const textEl = textRef.current;
    const canvas = canvasRef.current;
    if (!textEl || !canvas) return;

    const rect = textEl.getBoundingClientRect();
    const computed = getComputedStyle(textEl);
    const fontPx = parseFloat(computed.fontSize);
    const lineHeight = parseFloat(computed.lineHeight) || fontPx * 1.08;
    const fontSpec = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;

    // Compute each line's true baseline from the font's own metrics (not a
    // generic font-size ratio). Bodoni Moda's italic ascent/descent are
    // unusually generous (they need the room for swashes like the "j"), so a
    // guessed baseline sits much too high — canvas then draws the glyph
    // shifted up and the real descender never gets sampled at all.
    const metricsProbe = document.createElement("canvas").getContext("2d");
    if (!metricsProbe) return;
    metricsProbe.font = fontSpec;
    const fontMetrics = metricsProbe.measureText(computed.fontFamily);
    const ascent = fontMetrics.fontBoundingBoxAscent;
    const descent = fontMetrics.fontBoundingBoxDescent;
    // Half-leading can go negative here: Bodoni Moda's natural ascent+descent
    // exceeds this tight line-height, so CSS pulls the baseline up (not down)
    // to center the overflow symmetrically — clamping this to zero was what
    // pushed the sampled glyphs down and out of alignment with the real text.
    const halfLeading = (lineHeight - (ascent + descent)) / 2;
    const baselineWithinLine = halfLeading + ascent;

    const lineEls = Array.from(textEl.children) as HTMLElement[];
    const baselinesRaw = lineEls.map((lineEl) => lineEl.getBoundingClientRect().top - rect.top + baselineWithinLine);

    // Padding on EVERY side, not just below/right — decorative swashes can
    // extend past the glyph's nominal box in any direction (measured: the
    // "j" here curls about 0.2x font-size left of its own drawing origin).
    // This margin is comfortably larger than that measured worst case
    // without being the very large, canvas-quadrupling margin from initial
    // debugging — a bigger canvas means more area to scan per hover-start
    // and more pixels in play for the browser to composite each frame.
    const PAD = Math.max(35, fontPx * 0.55);
    const width = Math.ceil(rect.width + PAD * 2);
    const height = Math.ceil(Math.max(rect.height, ...baselinesRaw) + PAD * 2);
    if (width < 1 || height < 1) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.left = `${-PAD}px`;
    canvas.style.top = `${-PAD}px`;

    const off = document.createElement("canvas");
    off.width = width;
    off.height = height;
    const octx = off.getContext("2d");
    if (!octx) return;
    octx.fillStyle = "#fff";
    octx.font = fontSpec;
    octx.textBaseline = "alphabetic";
    // ctx.font doesn't carry CSS letter-spacing — without setting this
    // explicitly, canvas renders at normal tracking while the real text uses
    // this site's tight tracking, so the sampled glyphs drift further right
    // than the real ones with every subsequent character.
    octx.letterSpacing = computed.letterSpacing;
    const baselines = baselinesRaw.map((b) => b + PAD);
    lines.forEach((line, i) => octx.fillText(line, PAD, baselines[i]));

    const { data } = octx.getImageData(0, 0, width, height);

    // Same text, same fontSpec, same baselines — rendered again at native
    // pixel density purely so the exit animation has a crisp, gap-free image
    // to draw instead of leaning on the particle grid. Kept in a ref (not
    // discarded like a scratch canvas) since it's needed for the whole
    // lifetime of this hover session, not just at build time.
    const raster = document.createElement("canvas");
    raster.width = width * dpr;
    raster.height = height * dpr;
    const rctx = raster.getContext("2d");
    if (rctx) {
      rctx.scale(dpr, dpr);
      rctx.fillStyle = "#fff";
      rctx.font = fontSpec;
      rctx.textBaseline = "alphabetic";
      rctx.letterSpacing = computed.letterSpacing;
      lines.forEach((line, i) => rctx.fillText(line, PAD, baselines[i]));
    }
    rasterRef.current = raster;

    const now = performance.now();
    const points: Particle[] = [];
    for (let y = 0; y < height; y += STEP) {
      for (let x = 0; x < width; x += STEP) {
        if (blockHasInk(data, width, x, y, STEP, width, height, INK_ALPHA_THRESHOLD, INK_MARGIN_PX)) {
          // Convert the wrapper-relative entry point into this canvas's own
          // local space (canvas's local (0,0) sits at wrapper (-PAD,-PAD)).
          const entry = entryWrapper ? { x: entryWrapper.x + PAD, y: entryWrapper.y + PAD } : null;
          const startX = entry ? x + (entry.x - x) * ENTRY_PULL + (Math.random() - 0.5) * BURST_JITTER : x;
          const startY = entry ? y + (entry.y - y) * ENTRY_PULL + (Math.random() - 0.5) * BURST_JITTER : y;
          points.push({
            homeX: x,
            homeY: y,
            x: startX,
            y: startY,
            vx: 0,
            vy: 0,
            wakeAt: entryWrapper ? now + Math.random() * WAKE_STAGGER_MS : now,
          });
        }
      }
    }
    particlesRef.current = points;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // The canvas element itself stays at opacity 1 for its whole active
    // lifetime (set once, no transition) — the actual fade is this alpha,
    // applied to the drawn pixels directly, every frame, under full control.
    canvas.style.opacity = "1";

    const colors = colorsRef.current ?? { accent: hexToRgb("#ff6fb0"), foreground: hexToRgb("#ededed") };
    // eslint-disable-next-line react-hooks/purity -- runs inside a requestAnimationFrame callback, never during render
    const now = performance.now();
    const leaveStart = leaveStartRef.current;

    let canvasAlpha = 1;
    // How far into the exit crossfade the scattered dots have resolved into
    // the perfect solid raster (see rasterRef) — 0 = still all dots, 1 = the
    // raster is fully opaque and the dots have faded out completely under
    // it. Deliberately reaches 1 well before canvasAlpha reaches 0, so the
    // whole rest of the crossfade is just a gap-free image dissolving into
    // the real DOM text, not the dot reconstruction.
    let solidifyT = 0;
    if (crossfadeStartedRef.current && crossfadeStartTimeRef.current != null) {
      const t = Math.min(1, (now - crossfadeStartTimeRef.current) / CROSSFADE_MS);
      canvasAlpha = 1 - easeInOut(t);
      solidifyT = Math.min(1, t / SOLIDIFY_FRACTION);
    } else if (leaveStart == null && enterStartRef.current != null) {
      const t = Math.min(1, (now - enterStartRef.current) / CROSSFADE_MS);
      canvasAlpha = easeInOut(t);
    }
    let fillColor: string;
    if (leaveStart != null) {
      // Dissolving back to normal: sweep the dot color from pink to the real
      // text color as they settle, so the swap to crisp text reads as the
      // particles turning solid rather than two mismatched layers cutting over.
      const t = Math.min(1, (now - leaveStart) / SETTLE_MIN_MS);
      fillColor = lerpColor(colors.accent, colors.foreground, t);
    } else {
      fillColor = `rgb(${colors.accent.r}, ${colors.accent.g}, ${colors.accent.b})`;
    }
    ctx.fillStyle = fillColor;

    const mouse = mouseRef.current;
    let allSettled = true;
    // Dots fade out as the raster fades in (see below) — skip the whole pass
    // once they're fully invisible rather than paying for thousands of
    // arc()/fill() calls that would draw at zero opacity anyway.
    const dotsVisible = solidifyT < 1;
    // One shared path for every particle, filled once at the end — all
    // particles are the same color in a given frame anyway, so a separate
    // beginPath/arc/fill per particle (thousands of individual fill() calls
    // per frame at this density) was pure overhead, not needed for
    // correctness. Likely the actual source of the reported lag.
    if (dotsVisible) {
      ctx.globalAlpha = canvasAlpha * (1 - solidifyT);
      ctx.beginPath();
    }
    for (const p of particlesRef.current) {
      const awake = now >= p.wakeAt;
      if (awake) {
        if (mouse) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          if (dist < REPEL_RADIUS) {
            const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_STRENGTH;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }
        const springK =
          leaveStart != null ? EXIT_SPRING : now - p.wakeAt < ENTRANCE_WINDOW_MS ? ENTRANCE_SPRING : SPRING;
        p.vx += (p.homeX - p.x) * springK;
        p.vy += (p.homeY - p.y) * springK;
      } else {
        allSettled = false;
      }
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x += p.vx;
      p.y += p.vy;

      if (leaveStart != null && (Math.abs(p.x - p.homeX) > SETTLE_EPSILON_PX || Math.abs(p.y - p.homeY) > SETTLE_EPSILON_PX)) {
        allSettled = false;
      }

      if (dotsVisible) {
        ctx.moveTo(p.x + DOT_RADIUS, p.y);
        ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
      }
    }
    if (dotsVisible) ctx.fill();

    // Once the dots have (mostly) resolved, draw the real rasterized text
    // directly on top instead of continuing to rely on the dot grid — this
    // is the exact same image the particles were sampled from, at full
    // resolution, so it has no coverage gaps by construction. drawImage
    // paints it in white-on-transparent; source-in then recolors only the
    // pixels it actually drew (its real anti-aliased shape) to the current
    // sweep color, without touching anything outside that shape.
    if (solidifyT > 0 && rasterRef.current) {
      ctx.globalAlpha = canvasAlpha * solidifyT;
      ctx.drawImage(rasterRef.current, 0, 0, width, height);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();

    // Only crossfade to real text once the shape has actually reformed, not
    // after a guessed fixed delay. A fixed timeout could let the crossfade
    // start while some particles — displaced by repulsion right before you
    // left — are still visibly catching up, which reads as a piece of the
    // letterform vanishing and popping back once it finally arrives.
    if (leaveStart != null && !crossfadeStartedRef.current) {
      const elapsed = now - leaveStart;
      if ((allSettled && elapsed > SETTLE_MIN_MS) || elapsed > SETTLE_MAX_MS) {
        crossfadeStartedRef.current = true;
        crossfadeStartTimeRef.current = now;
        setHovered(false);
        cleanupTimeoutRef.current = setTimeout(() => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          if (canvasRef.current) canvasRef.current.style.opacity = "0";
        }, CROSSFADE_MS);
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
    };
  }, []);

  const handleEnter = async (e: ReactMouseEvent<HTMLSpanElement>) => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
    leaveStartRef.current = null;
    crossfadeStartedRef.current = false;
    crossfadeStartTimeRef.current = null;

    if (hovered) {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const textEl = textRef.current;
    if (!textEl) return;
    const token = ++enterTokenRef.current;
    const { clientX, clientY } = e;

    if (document.fonts && document.fonts.status !== "loaded") {
      try {
        await document.fonts.ready;
      } catch {
        // ignore — proceed with whatever's loaded
      }
    }
    await waitForStableFontSize(textEl, fontSize, 600);
    if (enterTokenRef.current !== token) return; // user already left/re-entered — this build is stale

    const rootStyles = getComputedStyle(document.documentElement);
    colorsRef.current = {
      accent: hexToRgb(rootStyles.getPropertyValue("--accent").trim() || "#ff6fb0"),
      foreground: hexToRgb(rootStyles.getPropertyValue("--foreground").trim() || "#ededed"),
    };

    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    const entry = wrapperRect ? { x: clientX - wrapperRect.left, y: clientY - wrapperRect.top } : null;
    buildParticles(entry);
    enterStartRef.current = performance.now();
    setHovered(true);
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(draw);
  };

  const handleLeave = () => {
    enterTokenRef.current++; // invalidate any in-flight handleEnter build
    mouseRef.current = null;
    const leaveNow = performance.now();
    leaveStartRef.current = leaveNow;
    enterStartRef.current = null;
    crossfadeStartedRef.current = false; // draw() decides when this leave's crossfade actually starts
    crossfadeStartTimeRef.current = null;
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
    // Particles get a staggered wake-up delay so the entrance looks like it's
    // assembling rather than popping in — but if you leave before a
    // far-off particle's delay has elapsed (eg. hovering only briefly), it's
    // still frozen at its spawn point. Left alone, it wakes up naturally
    // mid-exit and visibly snaps into motion — a stray "leftover" cluster
    // that suddenly jumps. Force everyone awake now so the gather-home is
    // uniform regardless of how long the hover lasted.
    for (const p of particlesRef.current) {
      if (p.wakeAt > leaveNow) p.wakeAt = leaveNow;
    }
  };

  const handleMove = (e: ReactMouseEvent<HTMLSpanElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
    >
      <motion.span
        ref={textRef}
        animate={{
          fontSize,
          opacity: hovered ? 0 : 1,
        }}
        transition={{
          fontSize: { type: "spring", stiffness: 140, damping: 16, mass: 0.7 },
          opacity: { duration: CROSSFADE_MS / 1000, ease: CROSSFADE_EASE },
        }}
        className="font-display block origin-top-left select-none italic leading-[1.08] tracking-tight text-foreground"
      >
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </motion.span>
      {/*
        No CSS opacity/transition here on purpose — the fade is driven
        entirely by hand in draw() via ctx.globalAlpha, every frame, so it's
        never subject to the browser's own compositing timing for this
        transition. React only sets the initial hidden state; draw() and the
        exit cleanup own everything after that.
      */}
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute" style={{ opacity: 0 }} />
    </span>
  );
}
