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
  accent = "var(--primary)",
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
      {/* Outer ring — the "O" — 8 nodes on a circle */}
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2" strokeOpacity="0.9" />

      {/* Neural pathways — 4 chords crossing the intelligence core */}
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.55">
        {/* 0° → 180° (horizontal axis) */}
        <line x1="54" y1="32" x2="10" y2="32" />
        {/* 45° → 225° */}
        <line x1="47.56" y1="16.44" x2="16.44" y2="47.56" />
        {/* 90° → 270° */}
        <line x1="32" y1="10" x2="32" y2="54" />
        {/* 135° → 315° */}
        <line x1="16.44" y1="16.44" x2="47.56" y2="47.56" />
      </g>

      {/* 8 outer nodes */}
      <g fill="currentColor">
        <circle cx="54" cy="32" r="2.6" />
        <circle cx="47.56" cy="16.44" r="2.6" />
        <circle cx="32" cy="10" r="2.6" />
        <circle cx="16.44" cy="16.44" r="2.6" />
        <circle cx="10" cy="32" r="2.6" />
        <circle cx="16.44" cy="47.56" r="2.6" />
        <circle cx="32" cy="54" r="2.6" />
        <circle cx="47.56" cy="47.56" r="2.6" />
      </g>

      {/* Intelligence core */}
      <circle cx="32" cy="32" r="5.2" fill={c} />
      <circle
        cx="32"
        cy="32"
        r="5.2"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1"
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
