import { cn } from "@/lib/utils";

/**
 * Abstract generative line field — data-inspired backdrop for Aurora Noir
 * surfaces. Deterministic (no randomness) so SSR and hydration agree.
 */
export function LineArt({
  className,
  lines = 14,
  opacity = 0.35,
  variant = "wave",
}: {
  className?: string;
  lines?: number;
  opacity?: number;
  variant?: "wave" | "fan";
}) {
  const paths = Array.from({ length: lines }, (_, i) => {
    const t = i / Math.max(1, lines - 1);
    if (variant === "fan") {
      const y = 200 - t * 150;
      return `M0 ${200} C ${180 + t * 60} ${y} ${420 - t * 40} ${y - 30} 600 ${40 + t * 40}`;
    }
    const amp = 26 + t * 34;
    const shift = t * 28;
    return `M0 ${120 + shift} C 150 ${120 + shift - amp} 300 ${120 + shift + amp} 450 ${120 + shift - amp / 2} S 600 ${120 + shift} 600 ${120 + shift}`;
  });

  return (
    <svg
      aria-hidden
      viewBox="0 0 600 240"
      preserveAspectRatio="none"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{ opacity }}
    >
      <defs>
        <linearGradient id="oq-line-art" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.05" />
          <stop offset="50%" stopColor="var(--primary-glow, var(--primary))" stopOpacity="0.75" />
          <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="url(#oq-line-art)" strokeWidth={0.75} />
      ))}
    </svg>
  );
}
