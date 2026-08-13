"use client";

import { motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Rect = { x: number; y: number; width: number; height: number };
type Frame = "polaroid" | "clean" | "circle";
type Tape = "pink" | "yellow" | "blue" | "none";

type TileSpec = {
  leftPct: number;
  topPct: number;
  widthVw: number;
  aspect: number;
  rotate: number;
  frame: Frame;
  tape?: Tape;
  caption?: string;
};

const TAPE_COLORS: Record<Tape, string> = {
  pink: "#ff9ec4",
  yellow: "#ffe066",
  blue: "#9fd8ff",
  none: "transparent",
};

// hand-scattered corkboard layout, tuned for 15 photos of mixed aspect ratios
const LAYOUT: TileSpec[] = [
  { leftPct: 7, topPct: 11, widthVw: 11, aspect: 0.5625, rotate: -8, frame: "polaroid", tape: "pink" },
  { leftPct: 27, topPct: 7, widthVw: 19, aspect: 1.78, rotate: 5, frame: "polaroid", tape: "blue" },
  { leftPct: 47, topPct: 13, widthVw: 12, aspect: 0.714, rotate: -5, frame: "circle" },
  { leftPct: 65, topPct: 9, widthVw: 13, aspect: 0.75, rotate: 9, frame: "polaroid", tape: "yellow" },
  { leftPct: 85, topPct: 14, widthVw: 12, aspect: 0.75, rotate: -10, frame: "polaroid", tape: "pink" },

  { leftPct: 6, topPct: 41, widthVw: 13, aspect: 0.75, rotate: 7, frame: "polaroid", tape: "yellow", caption: "soccer szn ⚽" },
  { leftPct: 25, topPct: 45, widthVw: 12, aspect: 0.75, rotate: -9, frame: "polaroid", tape: "blue" },
  { leftPct: 44, topPct: 41, widthVw: 13, aspect: 0.755, rotate: 4, frame: "circle" },
  { leftPct: 63, topPct: 44, widthVw: 11, aspect: 0.587, rotate: -6, frame: "polaroid", tape: "pink", caption: "fcb 4ever" },
  { leftPct: 82, topPct: 40, widthVw: 13, aspect: 0.75, rotate: 10, frame: "polaroid", tape: "yellow" },

  { leftPct: 10, topPct: 71, widthVw: 18, aspect: 1.333, rotate: -4, frame: "polaroid", tape: "blue", caption: "eh 🍁" },
  { leftPct: 32, topPct: 69, widthVw: 11, aspect: 0.5625, rotate: 8, frame: "polaroid", tape: "pink" },
  { leftPct: 50, topPct: 74, widthVw: 11, aspect: 0.5625, rotate: -7, frame: "clean" },
  { leftPct: 68, topPct: 70, widthVw: 14, aspect: 0.75, rotate: 6, frame: "polaroid", tape: "yellow", caption: "cooler than you, tbh" },
  { leftPct: 87, topPct: 73, widthVw: 11, aspect: 0.5625, rotate: -9, frame: "polaroid", tape: "pink" },
];

const STICKERS = [
  { leftPct: 55, topPct: 29, size: 26, rotate: -12, kind: "star" as const },
  { leftPct: 77, topPct: 60, size: 24, rotate: 16, kind: "heart" as const },
  { leftPct: 18, topPct: 58, size: 22, rotate: 10, kind: "star" as const },
];

function Star({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path
        d="M12 1.5l2.6 6.6 7 .5-5.4 4.5 1.8 6.9-6-3.9-6 3.9 1.8-6.9L2.4 8.6l7-.5z"
        fill="currentColor"
      />
    </svg>
  );
}

function Heart({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path
        d="M12 21s-7.5-4.6-10.2-9.2C.2 8.9 1.4 5 5 4.2c2.1-.5 4 .5 5 2.3 1-1.8 2.9-2.8 5-2.3 3.6.8 4.8 4.7 3.2 7.6C19.5 16.4 12 21 12 21z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Hovering the label fades in an interactive polaroid corkboard — mixed
 * sizes, rotations, tape, handwritten captions, and doodle stickers — with
 * a hole punched out over the label itself. Individual photos lift and
 * straighten on hover. Same reveal mechanic as LocationReveal, dressed way up.
 */
export function MontageReveal({
  label,
  images,
  className,
}: {
  label: string;
  images: string[];
  className?: string;
}) {
  const maskId = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: 1440, h: 900 });

  useEffect(() => setMounted(true), []);

  // force full decode (not just fetch) well before the first hover, so the
  // reveal doesn't stutter rasterizing 15 photos for the first time mid-spring
  useEffect(() => {
    images.forEach((src) => {
      const img = new window.Image();
      img.src = src;
      img.decode?.().catch(() => {});
    });
  }, [images]);

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!hovered) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = ref.current?.getBoundingClientRect();
      if (r) setRect({ x: r.left, y: r.top, width: r.width, height: r.height });
    };
    const onScrollOrResize = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [hovered]);

  const open = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered(true);
  };
  const close = () => {
    hideTimer.current = setTimeout(() => setHovered(false), 150);
  };

  const pad = 10;
  const hole = rect
    ? { x: rect.x - pad, y: rect.y - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  const tiles = images.slice(0, LAYOUT.length).map((src, i) => {
    const spec = LAYOUT[i];
    const w = (spec.widthVw / 100) * viewport.w;
    const h = w / spec.aspect;
    const cx = (spec.leftPct / 100) * viewport.w;
    const cy = (spec.topPct / 100) * viewport.h;
    return { src, w, h, cx, cy, ...spec };
  });

  const isPolaroid = (frame: Frame) => frame === "polaroid";
  const padX = (w: number) => w * 0.07;
  const padTop = (h: number) => h * 0.07;
  const padBottom = (h: number) => h * 0.24;

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={open}
        onMouseLeave={close}
        className={className}
      >
        {label}
      </span>
      {mounted &&
        createPortal(
          <div
            aria-hidden
            onMouseEnter={open}
            onMouseLeave={close}
            className="pointer-events-none fixed inset-0 z-[200] transition-opacity duration-300 ease-out"
            style={{ opacity: hovered && hole ? 1 : 0 }}
          >
            <svg width="100%" height="100%" className="h-full w-full overflow-hidden">
              <defs>
                <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {hole && (
                    <rect
                      x={hole.x}
                      y={hole.y}
                      width={hole.width}
                      height={hole.height}
                      rx={999}
                      fill="black"
                    />
                  )}
                </mask>
                {tiles.map((t, i) =>
                  t.frame === "circle" ? (
                    <clipPath key={i} id={`${maskId}-clip-${i}`}>
                      <circle cx={t.w / 2} cy={t.h / 2} r={Math.min(t.w, t.h) / 2} />
                    </clipPath>
                  ) : (
                    <clipPath key={i} id={`${maskId}-clip-${i}`}>
                      <rect
                        x={isPolaroid(t.frame) ? padX(t.w) : 0}
                        y={isPolaroid(t.frame) ? padTop(t.h) : 0}
                        width={isPolaroid(t.frame) ? t.w - padX(t.w) * 2 : t.w}
                        height={isPolaroid(t.frame) ? t.h - padTop(t.h) - padBottom(t.h) : t.h}
                        rx={isPolaroid(t.frame) ? 3 : 14}
                      />
                    </clipPath>
                  ),
                )}
              </defs>

              <g mask={`url(#${maskId})`}>
                <rect x="0" y="0" width="100%" height="100%" fill="var(--background)" fillOpacity="0.97" />

                {STICKERS.map((s, i) => (
                  <motion.g
                    key={`sticker-${i}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={hovered ? { opacity: 0.9, scale: 1 } : { opacity: 0, scale: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 20, delay: hovered ? 0.22 + i * 0.05 : 0 }}
                    style={{
                      x: (s.leftPct / 100) * viewport.w - s.size / 2,
                      y: (s.topPct / 100) * viewport.h - s.size / 2,
                    }}
                  >
                    {s.kind === "star" ? (
                      <Star size={s.size} className="text-accent" />
                    ) : (
                      <Heart size={s.size} className="text-accent" />
                    )}
                  </motion.g>
                ))}

                {tiles.map((t, i) => (
                  <motion.g
                    key={i}
                    style={{
                      x: t.cx - t.w / 2,
                      y: t.cy - t.h / 2,
                      originX: "50%",
                      originY: "50%",
                      pointerEvents: hovered ? "auto" : "none",
                    }}
                    initial={{ opacity: 0, scale: 0.5, rotate: t.rotate + (i % 2 === 0 ? -14 : 14) }}
                    animate={
                      hovered
                        ? { opacity: 1, scale: 1, rotate: t.rotate }
                        : { opacity: 0, scale: 0.5, rotate: t.rotate + (i % 2 === 0 ? -14 : 14) }
                    }
                    whileHover={{ scale: 1.12, rotate: 0, zIndex: 10 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 22,
                      mass: 0.5,
                      delay: hovered ? i * 0.018 : 0,
                    }}
                    className="cursor-default"
                  >
                    {/* flat, filter-free shadow — cheap to render vs. a blurred feDropShadow */}
                    {t.frame === "circle" ? (
                      <circle
                        cx={t.w / 2 + 4}
                        cy={t.h / 2 + 6}
                        r={Math.min(t.w, t.h) / 2 + 5}
                        fill="#000"
                        opacity={0.28}
                      />
                    ) : (
                      <rect x={4} y={6} width={t.w} height={t.h} rx={5} fill="#000" opacity={0.28} />
                    )}

                    {t.frame === "polaroid" && (
                      <rect x={0} y={0} width={t.w} height={t.h} rx={5} fill="#f9f7f1" />
                    )}
                    {t.frame === "circle" && (
                      <circle cx={t.w / 2} cy={t.h / 2} r={Math.min(t.w, t.h) / 2 + 5} fill="#f9f7f1" />
                    )}

                    <g clipPath={`url(#${maskId}-clip-${i})`}>
                      <image
                        href={t.src}
                        x={t.frame === "circle" ? (t.w - Math.min(t.w, t.h)) / 2 : 0}
                        y={t.frame === "circle" ? (t.h - Math.min(t.w, t.h)) / 2 : 0}
                        width={t.frame === "circle" ? Math.min(t.w, t.h) : t.w}
                        height={t.frame === "circle" ? Math.min(t.w, t.h) : t.h}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </g>

                    {t.frame !== "circle" && (
                      <rect
                        x={0.5}
                        y={0.5}
                        width={t.w - 1}
                        height={t.h - 1}
                        rx={t.frame === "polaroid" ? 5 : 14}
                        fill="none"
                        stroke="rgba(0,0,0,0.15)"
                      />
                    )}

                    {t.caption && (
                      <text
                        x={t.w / 2}
                        y={t.h - padBottom(t.h) / 2 - t.w * 0.01}
                        textAnchor="middle"
                        fill="#2a2a2a"
                        fontFamily="var(--font-hand)"
                        fontWeight={700}
                        fontSize={Math.max(13, t.w * 0.115)}
                        transform={`rotate(${(i % 2 === 0 ? -2.5 : 2.5)}, ${t.w / 2}, ${t.h - padBottom(t.h) / 2})`}
                      >
                        {t.caption}
                      </text>
                    )}

                    {t.frame === "polaroid" && t.tape && t.tape !== "none" && (
                      <rect
                        x={t.w / 2 - t.w * 0.14}
                        y={-t.w * 0.045}
                        width={t.w * 0.28}
                        height={t.w * 0.09}
                        rx={2}
                        fill={TAPE_COLORS[t.tape]}
                        fillOpacity={0.75}
                        transform={`rotate(${i % 3 === 0 ? -6 : 6}, ${t.w / 2}, 0)`}
                      />
                    )}
                  </motion.g>
                ))}
              </g>
            </svg>
          </div>,
          document.body,
        )}
    </>
  );
}
