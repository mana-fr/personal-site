"use client";

import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Milestone = {
  age: string;
  title: ReactNode;
  description: ReactNode;
};

const linkClass = "underline decoration-border underline-offset-4 hover:text-accent hover:decoration-accent";
const voxaLinkClass =
  "text-accent underline decoration-accent/50 underline-offset-4 transition-colors hover:decoration-accent";

const MILESTONES: Milestone[] = [
  {
    age: "age 7",
    title: "started code camps",
    description: <>went to my first code camps and got hooked — the spark that got me into tech and business.</>,
  },
  {
    age: "age 8",
    title: "started the bhagavad gita",
    description: (
      <>
        started memorizing all 700 verses of the bhagavad gita in sanskrit. it built a level of discipline
        and resilience i still lean on today.
      </>
    ),
  },
  {
    age: "age 9",
    title: "started learning python",
    description: <>picked up python and started writing real code instead of just tinkering.</>,
  },
  {
    age: "age 10",
    title: "finished the gita, gold in texas",
    description: <>finished memorizing all 700 verses of the gita and got a gold medal in texas.</>,
  },
  {
    age: "age 11",
    title: (
      <>
        started{" "}
        <Link href="https://voxaassistant.com" target="_blank" rel="noopener noreferrer" className={voxaLinkClass}>
          voxa voice
        </Link>
      </>
    ),
    description: (
      <>
        started building{" "}
        <Link href="https://voxaassistant.com" target="_blank" rel="noopener noreferrer" className={voxaLinkClass}>
          voxa voice
        </Link>{" "}
        after watching my dad&apos;s business miss calls it couldn&apos;t afford to miss. got scouted to
        play academy-level soccer as a training player — a first for me. soft-launched a few days before
        turning 12.
      </>
    ),
  },
  {
    age: "age 12",
    title: "voxa, for real",
    description: (
      <>
        started building an online brand and scaled{" "}
        <Link href="https://voxaassistant.com" target="_blank" rel="noopener noreferrer" className={voxaLinkClass}>
          voxa voice
        </Link>{" "}
        to 5+ pilots and first revenue. founded{" "}
        <Link href="https://getvoxa.co" target="_blank" rel="noopener noreferrer" className={voxaLinkClass}>
          voxa agents
        </Link>{" "}
        under the umbrella company, voxa. picked up a medici grant from 1517 and had a wild press run —
        business insider, economic times, times of india, moneycontrol, and more. still playing academy
        soccer, now full-time.
      </>
    ),
  },
];

const STOP_FRACTIONS = MILESTONES.map((_, i) => i / (MILESTONES.length - 1));
const CAR_WIDTH = 104;
const CAR_HEIGHT = (CAR_WIDTH * 90) / 200;
const TRAVEL_TIME = 1.8;
const PAUSE_TIME = 1.4;

export function RoadTimeline() {
  const roadRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDriving, setIsDriving] = useState(true);
  const x = useMotionValue(0);
  const playbackRef = useRef<ReturnType<typeof animate> | null>(null);
  const autoDriveRef = useRef(true);

  useEffect(() => {
    const el = roadRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setTrackWidth(Math.max(entry.contentRect.width - CAR_WIDTH, 0));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const drive = () => {
    const stopsX = STOP_FRACTIONS.map((f) => f * trackWidth);
    if (!trackWidth || stopsX.length < 2) return;
    playbackRef.current?.stop();

    const keyframes: number[] = [];
    const times: number[] = [];
    let t = 0;
    const totalDuration = PAUSE_TIME * stopsX.length + TRAVEL_TIME * (stopsX.length - 1);

    stopsX.forEach((sx, i) => {
      keyframes.push(sx);
      times.push(t / totalDuration);
      t += PAUSE_TIME;
      keyframes.push(sx);
      times.push(Math.min(t / totalDuration, 1));
      if (i < stopsX.length - 1) t += TRAVEL_TIME;
    });
    times[times.length - 1] = 1;

    playbackRef.current = animate(x, keyframes, {
      duration: totalDuration,
      times,
      ease: "easeInOut",
      repeat: Infinity,
    });
  };

  useEffect(() => {
    if (autoDriveRef.current) drive();
    return () => playbackRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackWidth]);

  useMotionValueEvent(x, "change", (latest) => {
    const stopsX = STOP_FRACTIONS.map((f) => f * trackWidth);
    if (!stopsX.length) return;
    let nearest = 0;
    let best = Infinity;
    stopsX.forEach((sx, i) => {
      const d = Math.abs(sx - latest);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setActiveIndex(nearest);
  });

  return (
    <div>
      <div ref={roadRef} className="relative h-24 w-full select-none">
        <div className="absolute left-0 right-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full bg-[#1c1c1c]">
          <div
            className="absolute inset-y-0 left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 opacity-60"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #fff 0px, #fff 10px, transparent 10px, transparent 22px)",
            }}
          />
        </div>

        {MILESTONES.map((m, i) => (
          <div
            key={m.age}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: STOP_FRACTIONS[i] * trackWidth + CAR_WIDTH / 2 }}
          >
            <div
              className={`h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 transition-colors duration-300 ${
                activeIndex === i ? "border-accent bg-accent" : "border-border bg-background"
              }`}
            />
            <span
              className={`absolute top-4 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-widest transition-colors duration-300 ${
                activeIndex === i ? "text-accent" : "text-muted"
              }`}
            >
              {m.age}
            </span>
          </div>
        ))}

        <div className="absolute left-0 top-1/2 -translate-y-1/2" style={{ marginTop: -CAR_HEIGHT / 2 + 6 }}>
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: trackWidth }}
            dragElastic={0}
            dragMomentum={false}
            style={{ x, width: CAR_WIDTH }}
            onDragStart={() => {
              playbackRef.current?.stop();
              autoDriveRef.current = false;
              setIsDriving(false);
            }}
            onDragEnd={() => {
              const stopsX = STOP_FRACTIONS.map((f) => f * trackWidth);
              if (!stopsX.length) return;
              const current = x.get();
              let nearest = stopsX[0];
              let best = Infinity;
              stopsX.forEach((sx) => {
                const d = Math.abs(sx - current);
                if (d < best) {
                  best = d;
                  nearest = sx;
                }
              });
              animate(x, nearest, { type: "spring", stiffness: 260, damping: 24 });
            }}
            whileDrag={{ scale: 1.06 }}
            className="cursor-grab touch-none active:cursor-grabbing"
          >
            <Chiron />
          </motion.div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="neu mt-8 max-w-lg rounded-2xl p-6"
        >
          <p className="text-[12px] uppercase tracking-widest text-accent">{MILESTONES[activeIndex].age}</p>
          <p className="mt-1 text-[15px] text-foreground">{MILESTONES[activeIndex].title}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">{MILESTONES[activeIndex].description}</p>
        </motion.div>
      </AnimatePresence>

      {!isDriving && (
        <button
          type="button"
          onClick={() => {
            autoDriveRef.current = true;
            setIsDriving(true);
            drive();
          }}
          className={`mt-4 text-[12px] text-muted ${linkClass}`}
        >
          ▸ drive again
        </button>
      )}
    </div>
  );
}

function Chiron() {
  return (
    <svg viewBox="0 0 200 90" className="h-auto w-full drop-shadow-[0_10px_12px_rgba(0,0,0,0.35)]">
      <defs>
        <linearGradient id="chironBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffc2e0" />
          <stop offset="45%" stopColor="#ff4fa8" />
          <stop offset="100%" stopColor="#d61f7c" />
        </linearGradient>
        <linearGradient id="chironGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b3b45" />
          <stop offset="100%" stopColor="#17171c" />
        </linearGradient>
      </defs>

      <ellipse cx="100" cy="82" rx="78" ry="6" fill="black" opacity="0.25" />

      <path
        d="M8 58c2-10 10-16 22-18l14-10c8-6 20-10 34-10h30c12 0 22 4 30 12l14 12c10 2 18 6 22 12 4 6 4 10-2 12-4 1-8 1-12 1H20c-6 0-10-2-11-8-1-2-1-3-1-3Z"
        fill="url(#chironBody)"
      />
      <path d="M60 32c6-6 16-10 26-10h16c9 0 16 4 22 10l8 10H54Z" fill="url(#chironGlass)" opacity="0.9" />
      <path d="M20 44h150" stroke="#ffe1f0" strokeWidth="2" opacity="0.5" strokeLinecap="round" />

      <circle cx="52" cy="66" r="14" fill="#111" />
      <circle cx="52" cy="66" r="6" fill="#555" />
      <circle cx="148" cy="66" r="14" fill="#111" />
      <circle cx="148" cy="66" r="6" fill="#555" />
    </svg>
  );
}
