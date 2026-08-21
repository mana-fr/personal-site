"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { DOODLES } from "./Doodles";

/**
 * A hidden piece of art tucked into the margins of a page.
 * It stays nearly invisible until it drifts into view on scroll,
 * then blooms further on hover. Drop a real image in /public/art
 * and pass `src` to replace the placeholder line-art.
 */
export function ArtSpot({
  variant = 0,
  src,
  size = 90,
  className = "",
  rotate = 0,
}: {
  variant?: number;
  src?: string;
  size?: number;
  className?: string;
  rotate?: number;
}) {
  const Doodle = DOODLES[variant % DOODLES.length];

  return (
    <motion.div
      className={`pointer-events-none absolute select-none text-foreground/0 ${className}`}
      style={{ width: size, height: size }}
      // color is given explicitly here (not left for Motion to sniff from
      // the class above) because Tailwind compiles that /0 opacity modifier
      // via oklab() color-mix, and Motion's color interpolator can't parse
      // that format as a starting point — it would throw "is not an
      // animatable color" and silently fail to animate at all. This way
      // Motion tracks its own starting value and never needs to read it.
      initial={{ opacity: 0, scale: 0.85, rotate: rotate - 4, color: "var(--muted)" }}
      whileInView={{ opacity: 1, scale: 1, rotate, color: "var(--muted)" }}
      whileHover={{ opacity: 1, scale: 1.08, color: "var(--accent)" }}
      viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="pointer-events-auto relative h-full w-full opacity-40 transition-opacity duration-500 hover:opacity-90">
        {src ? (
          <Image src={src} alt="" fill className="object-contain" />
        ) : (
          <Doodle className="h-full w-full" />
        )}
      </div>
    </motion.div>
  );
}
