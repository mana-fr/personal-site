"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Hovering the label fades in a full-screen photo with a hole
 * punched out over the label itself — everything else on screen
 * becomes the photo, only the hovered element stays visible.
 */
export function LocationReveal({
  label,
  image,
  className = "rounded-full border border-border px-3 py-1 transition-colors duration-300 hover:border-accent hover:text-accent",
}: {
  label: string;
  image: string;
  className?: string;
}) {
  const maskId = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => setMounted(true), []);

  // Force full decode (not just fetch) well before the first hover, so the
  // reveal doesn't stutter loading the photo for the first time mid-fade.
  // Done here (client-side, after mount) rather than via a render-blocking
  // preload — this image isn't needed for the initial paint, and preloading
  // it eagerly was competing with actually-critical resources (fonts, JS)
  // for bandwidth on the initial page load.
  useEffect(() => {
    const img = new window.Image();
    img.src = image;
    img.decode?.().catch(() => {});
  }, [image]);

  useEffect(() => {
    if (!hovered) return;
    const update = () => {
      const r = ref.current?.getBoundingClientRect();
      if (r) setRect({ x: r.left, y: r.top, width: r.width, height: r.height });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [hovered]);

  const pad = 10;
  const hole = rect
    ? { x: rect.x - pad, y: rect.y - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={className}
      >
        {label}
      </span>
      {mounted &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[200] transition-opacity duration-500 ease-out"
            style={{ opacity: hovered && hole ? 1 : 0 }}
          >
            <svg width="100%" height="100%" className="h-full w-full">
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
              </defs>
              <image
                href={image}
                x="0"
                y="0"
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid slice"
                mask={`url(#${maskId})`}
              />
            </svg>
          </div>,
          document.body,
        )}
    </>
  );
}
