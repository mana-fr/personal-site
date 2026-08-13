"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const COUNT = 8;

export function SparkleBurst({ burstId }: { burstId: number }) {
  const sparkles = useMemo(() => {
    return Array.from({ length: COUNT }).map((_, i) => {
      const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 30 + Math.random() * 90;
      return {
        id: i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist * 0.7,
        delay: Math.random() * 0.18,
        size: 7 + Math.random() * 10,
        rotate: Math.random() * 200 - 100,
      };
    });
  }, [burstId]);

  if (burstId === 0) return null;

  return (
    <span className="pointer-events-none absolute left-[18%] top-1/2 z-10 h-0 w-0 overflow-visible">
      {sparkles.map((s) => (
        <motion.span
          key={`${burstId}-${s.id}`}
          className="absolute text-accent"
          style={{ fontSize: s.size, left: 0, top: 0 }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0, rotate: 0 }}
          animate={{ opacity: [0, 1, 0], x: s.x, y: s.y, scale: [0, 1, 0.5], rotate: s.rotate }}
          transition={{ duration: 0.85, delay: s.delay, ease: [0.16, 1, 0.3, 1] }}
        >
          ✦
        </motion.span>
      ))}
    </span>
  );
}
