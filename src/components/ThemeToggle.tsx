"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/80 text-foreground/70 transition-colors hover:border-accent hover:text-accent"
    >
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className={`absolute transition-all duration-300 ${
          isDark ? "scale-100 opacity-100 rotate-0" : "scale-50 opacity-0 -rotate-45"
        }`}
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className={`absolute transition-all duration-300 ${
          isDark ? "scale-50 opacity-0 rotate-45" : "scale-100 opacity-100 rotate-0"
        }`}
      >
        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
