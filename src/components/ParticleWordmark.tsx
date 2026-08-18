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

const STEP = 2; // sampling grid spacing, css px — fine enough to catch thin curled strokes (eg. the "j" swash's terminal loop)
const INK_ALPHA_THRESHOLD = 50; // low enough to catch anti-aliased/thin ink, not just solid fill
const REPEL_RADIUS = 46;
const REPEL_STRENGTH = 1.4;
const SPRING = 0.05; // interactive spring once a particle has settled in — snappy repel/return
const ENTRANCE_SPRING = 0.017; // slower spring while a particle is still arriving — graceful assembly
const ENTRANCE_WINDOW_MS = 620; // how long after waking a particle uses the slower entrance spring
const EXIT_SPRING = 0.015; // slow spring while dissolving back to text — unhurried gather-home
const DAMPING = 0.8;
const DOT_RADIUS = 1.15;
const SETTLE_MS = 700; // grace period after mouseleave: slow gather + color sweep, before crossfading back
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

// Checks every pixel in a STEP-sized block, not just its corner — a fixed
// sampling grid can otherwise straddle a thin curved stroke (eg. the tight
// little terminal loop on Bodoni Moda's italic "j") and miss it entirely if
// no exact grid point happens to land on it.
function blockHasInk(
  data: Uint8ClampedArray,
  stride: number,
  x0: number,
  y0: number,
  size: number,
  maxX: number,
  maxY: number,
  threshold: number,
) {
  const xEnd = Math.min(x0 + size, maxX);
  const yEnd = Math.min(y0 + size, maxY);
  for (let y = y0; y < yEnd; y++) {
    for (let x = x0; x < xEnd; x++) {
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
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveStartRef = useRef<number | null>(null);
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

    // Fixed, generous padding on EVERY side, not just below/right. Decorative
    // swashes can extend past the glyph's nominal box in any direction — the
    // "j" here curls left of its own drawing origin (x=0), not just below
    // the line, and every previous fix only ever padded right/bottom, so it
    // never touched that side no matter how generous it got.
    const PAD = Math.max(50, fontPx * 1.2);
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
    const now = performance.now();
    const points: Particle[] = [];
    for (let y = 0; y < height; y += STEP) {
      for (let x = 0; x < width; x += STEP) {
        if (blockHasInk(data, width, x, y, STEP, width, height, INK_ALPHA_THRESHOLD)) {
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

    const rootStyles = getComputedStyle(document.documentElement);
    const accentHex = rootStyles.getPropertyValue("--accent").trim() || "#ff6fb0";
    // eslint-disable-next-line react-hooks/purity -- runs inside a requestAnimationFrame callback, never during render
    const now = performance.now();
    const leaveStart = leaveStartRef.current;
    if (leaveStart != null) {
      // Dissolving back to normal: sweep the dot color from pink to the real
      // text color as they settle, so the swap to crisp text reads as the
      // particles turning solid rather than two mismatched layers cutting over.
      const t = Math.min(1, (now - leaveStart) / SETTLE_MS);
      const foregroundHex = rootStyles.getPropertyValue("--foreground").trim() || "#ededed";
      ctx.fillStyle = lerpColor(hexToRgb(accentHex), hexToRgb(foregroundHex), t);
    } else {
      ctx.fillStyle = accentHex;
    }

    const mouse = mouseRef.current;
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
      }
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x += p.vx;
      p.y += p.vy;

      ctx.beginPath();
      ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    rafRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    };
  }, []);

  const handleEnter = async (e: ReactMouseEvent<HTMLSpanElement>) => {
    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }
    leaveStartRef.current = null;

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

    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    const entry = wrapperRect ? { x: clientX - wrapperRect.left, y: clientY - wrapperRect.top } : null;
    buildParticles(entry);
    setHovered(true);
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(draw);
  };

  const handleLeave = () => {
    enterTokenRef.current++; // invalidate any in-flight handleEnter build
    mouseRef.current = null;
    const leaveNow = performance.now();
    leaveStartRef.current = leaveNow;
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
    settleTimeoutRef.current = setTimeout(() => {
      setHovered(false);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }, SETTLE_MS);
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
          filter: hovered ? "blur(5px)" : "blur(0px)",
        }}
        transition={{
          fontSize: { type: "spring", stiffness: 140, damping: 16, mass: 0.7 },
          opacity: { duration: CROSSFADE_MS / 1000, ease: CROSSFADE_EASE },
          filter: { duration: CROSSFADE_MS / 1000, ease: CROSSFADE_EASE },
        }}
        className="font-display block origin-top-left select-none italic leading-[1.08] tracking-tight text-foreground"
      >
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </motion.span>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute transition-[opacity,filter] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          opacity: hovered ? 1 : 0,
          filter: hovered ? "blur(0px)" : "blur(5px)",
          transitionDuration: `${CROSSFADE_MS}ms`,
        }}
      />
    </span>
  );
}
