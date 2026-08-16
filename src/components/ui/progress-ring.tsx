import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  thickness?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
  tone?: "gold" | "primary" | "danger";
  className?: string;
}

const stroke: Record<NonNullable<ProgressRingProps["tone"]>, string> = {
  gold: "var(--gold)",
  primary: "var(--primary)",
  danger: "var(--destructive)",
};

/**
 * ProgressRing — radial progress for scores, disk/RAM gauges and long tasks.
 */
export function ProgressRing({
  value,
  size = 96,
  thickness = 8,
  label,
  sublabel,
  tone = "gold",
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(clamped)}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke[tone]}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * clamped) / 100}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-lg font-semibold tabular-nums leading-none text-foreground">
          {label ?? `${Math.round(clamped)}%`}
        </span>
        {sublabel && (
          <span className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
