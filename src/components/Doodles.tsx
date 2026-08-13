// Placeholder line-art. Swap these for real art later — see ArtSpot.
export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" fill="none" className={className}>
      <path
        d="M2 30c8-22 20-22 28 0s20 22 28 0 20-22 28 0 20 22 28 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 60" fill="none" className={className}>
      <path
        d="M30 4v20M30 36v20M4 30h20M36 30h20M12 12l14 14M34 34l14 14M48 12L34 26M26 34 12 48"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Spiral({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className}>
      <path
        d="M40 40c0-6 5-9 9-6s4 10-2 12-14-2-15-11 6-18 17-17 20 11 18 22-14 19-27 16"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Orbit({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className}>
      <circle cx="40" cy="40" r="3" fill="currentColor" />
      <ellipse cx="40" cy="40" rx="36" ry="14" stroke="currentColor" strokeWidth="1" />
      <ellipse
        cx="40"
        cy="40"
        rx="36"
        ry="14"
        stroke="currentColor"
        strokeWidth="1"
        transform="rotate(60 40 40)"
      />
      <ellipse
        cx="40"
        cy="40"
        rx="36"
        ry="14"
        stroke="currentColor"
        strokeWidth="1"
        transform="rotate(120 40 40)"
      />
    </svg>
  );
}

export const DOODLES = [Squiggle, Spark, Spiral, Orbit];
