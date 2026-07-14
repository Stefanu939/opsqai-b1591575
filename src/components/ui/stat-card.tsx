import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: string; direction: "up" | "down" | "flat" };
  className?: string;
}

/**
 * StatCard — v2 KPI primitive. Only used when a real number tells the
 * operator something actionable. No decorative KPI walls.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-xs transition-colors",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />}
      </div>
      <div className="font-display text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {(hint || trend) && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          {trend && (
            <span
              className={cn(
                "font-medium tabular-nums",
                trend.direction === "up" && "text-[color:var(--success)]",
                trend.direction === "down" && "text-[color:var(--destructive)]",
              )}
            >
              {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "—"}{" "}
              {trend.value}
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </div>
  );
}
