import { cn } from "@/lib/utils";

/**
 * OPSQAI Knowledge Graph Mark.
 *
 * A circular "O" formed by 8 outer nodes, threaded by neural pathways that
 * cross through an intelligence core. The geometry doubles as an operational
 * routing graph — warehouse pathways meeting AI inference.
 *
 * - Strokes use `currentColor` so the mark works in any context (mono/inverted).
 * - The core node uses the `accent` color (defaults to `--primary`) for the
 *   2-tone enterprise lockup. Pass `mono` for true single-color.
 */
export function LogoMark({
  className,
  size = 32,
  accent = "var(--gold)",
  mono = false,
  title = "OPSQAI",
}: {
  className?: string;
  size?: number;
  accent?: string;
  mono?: boolean;
  title?: string;
}) {
  const c = mono ? "currentColor" : accent;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="opsqai-sovereign-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mono ? "currentColor" : "var(--gold-soft-solid, #F0D78C)"} />
          <stop offset="1" stopColor={mono ? "currentColor" : c} />
        </linearGradient>
      </defs>

      {/* Outer octagonal cartouche */}
      <polygon
        points="42.71,6.13 57.87,21.29 57.87,42.71 42.71,57.87 21.29,57.87 6.13,42.71 6.13,21.29 21.29,6.13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeOpacity="0.92"
      />
      {/* Inner gravure line */}
      <polygon
        points="41.19,9.82 54.18,22.81 54.18,41.19 41.19,54.18 22.81,54.18 9.82,41.19 9.82,22.81 22.81,9.82"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
        strokeOpacity="0.45"
      />
      {/* Coronet nodes */}
      <g fill="currentColor" fillOpacity="0.8">
        <circle cx="40.43" cy="11.67" r="1.15" />
        <circle cx="52.33" cy="23.57" r="1.15" />
        <circle cx="52.33" cy="40.43" r="1.15" />
        <circle cx="40.43" cy="52.33" r="1.15" />
        <circle cx="23.57" cy="52.33" r="1.15" />
        <circle cx="11.67" cy="40.43" r="1.15" />
        <circle cx="11.67" cy="23.57" r="1.15" />
        <circle cx="23.57" cy="11.67" r="1.15" />
      </g>
      {/* Engraved OQ monogram */}
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="'Cormorant Garamond', Cormorant, Georgia, serif"
        fontWeight={500}
        fontSize="27"
        letterSpacing="-1.2"
        fill="url(#opsqai-sovereign-gold)"
      >
        OQ
      </text>
      <line
        x1="34.5"
        y1="42.5"
        x2="38"
        y2="46.4"
        stroke="url(#opsqai-sovereign-gold)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoWordmark({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn("font-display font-semibold tracking-[-0.01em] leading-none", className)}
      style={{ fontSize: size, letterSpacing: "-0.012em" }}
    >
      OPSQAI
    </span>
  );
}

/** Horizontal lockup: mark + wordmark side-by-side. Primary brand expression. */
export function Logo({
  className,
  size = 28,
  showWordmark = true,
  mono = false,
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  mono?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} mono={mono} />
      {showWordmark && <LogoWordmark size={Math.round(size * 0.58)} />}
    </span>
  );
}

/** Stacked lockup: mark above wordmark. For auth, splash, app store. */
export function LogoStacked({
  className,
  size = 56,
  mono = false,
}: {
  className?: string;
  size?: number;
  mono?: boolean;
}) {
  return (
    <span className={cn("inline-flex flex-col items-center gap-2.5", className)}>
      <LogoMark size={size} mono={mono} />
      <LogoWordmark size={Math.round(size * 0.34)} />
    </span>
  );
}
