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

const STEP = 3; // sampling grid spacing, css px
const REPEL_RADIUS = 46;
const REPEL_STRENGTH = 1.4;
const SPRING = 0.05;
const DAMPING = 0.8;
const DOT_RADIUS = 1.15;
const SETTLE_MS = 500; // grace period after mouseleave so particles snap home before crossfading back
const BURST_JITTER = 22; // px of random scatter around the cursor's entry point
const WAKE_STAGGER_MS = 220; // spread of entrance delays across particles
const CROSSFADE_MS = 320;

/**
 * Renders text normally, but on hover it bursts into a field of dots
 * (colored with --accent) that fly outward from the cursor's entry point,
 * settle into the letterforms with a staggered spring, and scatter away
 * from the cursor as it moves. On mouseleave the dots resettle into place
 * and dissolve-crossfade back to real text.
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
  const textRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useState(false);

  const buildParticles = (entry: { x: number; y: number } | null) => {
    const textEl = textRef.current;
    const canvas = canvasRef.current;
    if (!textEl || !canvas) return;

    const rect = textEl.getBoundingClientRect();
    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);
    if (width < 1 || height < 1) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const computed = getComputedStyle(textEl);
    const off = document.createElement("canvas");
    off.width = width;
    off.height = height;
    const octx = off.getContext("2d");
    if (!octx) return;
    octx.fillStyle = "#fff";
    octx.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    octx.textBaseline = "alphabetic";

    const fontPx = parseFloat(computed.fontSize);
    const lineHeight = fontPx * 1.08;
    lines.forEach((line, i) => {
      octx.fillText(line, 0, fontPx * 0.82 + i * lineHeight);
    });

    const { data } = octx.getImageData(0, 0, width, height);
    const now = performance.now();
    const points: Particle[] = [];
    for (let y = 0; y < height; y += STEP) {
      for (let x = 0; x < width; x += STEP) {
        if (data[(y * width + x) * 4 + 3] > 120) {
          const startX = entry ? entry.x + (Math.random() - 0.5) * BURST_JITTER : x;
          const startY = entry ? entry.y + (Math.random() - 0.5) * BURST_JITTER : y;
          points.push({
            homeX: x,
            homeY: y,
            x: startX,
            y: startY,
            vx: 0,
            vy: 0,
            wakeAt: entry ? now + Math.random() * WAKE_STAGGER_MS : now,
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
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff6fb0";

    const mouse = mouseRef.current;
    // eslint-disable-next-line react-hooks/purity -- runs inside a requestAnimationFrame callback, never during render
    const now = performance.now();
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
        p.vx += (p.homeX - p.x) * SPRING;
        p.vy += (p.homeY - p.y) * SPRING;
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

  const handleEnter = (e: ReactMouseEvent<HTMLSpanElement>) => {
    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }
    if (!hovered) {
      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      const entry = rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null;
      buildParticles(entry);
      mouseRef.current = entry;
      setHovered(true);
    }
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(draw);
    }
  };

  const handleLeave = () => {
    mouseRef.current = null;
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
          opacity: { duration: CROSSFADE_MS / 1000, ease: [0.16, 1, 0.3, 1] },
          filter: { duration: CROSSFADE_MS / 1000, ease: [0.16, 1, 0.3, 1] },
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
        className="pointer-events-none absolute left-0 top-0 transition-[opacity,filter] ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          opacity: hovered ? 1 : 0,
          filter: hovered ? "blur(0px)" : "blur(5px)",
          transitionDuration: `${CROSSFADE_MS}ms`,
        }}
      />
    </span>
  );
}
