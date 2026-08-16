import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export interface MetricTileProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  /** Inline sparkline series — plain numbers, newest last. */
  series?: number[];
  tone?: "default" | "gold" | "warning" | "danger" | "success";
  /** Makes the tile an interactive drill-down button. */
  onClick?: () => void;
  className?: string;
}

const toneRing: Record<NonNullable<MetricTileProps["tone"]>, string> = {
  default: "border-border",
  gold: "border-gold-line bg-gold-soft/40",
  warning: "border-amber-500/35 bg-amber-500/5",
  danger: "border-destructive/35 bg-destructive/5",
  success: "border-emerald-500/30 bg-emerald-500/5",
};

/**
 * MetricTile — KPI unit of the Command Deck: value, delta and an optional
 * inline sparkline. Reuse this everywhere instead of bespoke KPI markup.
 */
export function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  series,
  tone = "default",
  onClick,
  className,
}: MetricTileProps) {
  const data = (series ?? []).map((v, i) => ({ i, v }));
  const id = `spark-${label.replace(/\W+/g, "-").toLowerCase()}`;

  const Root = (onClick ? "button" : "div") as "button";

  return (
    <Root
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card p-4 text-left shadow-xs oq-lift",
        onClick &&
          "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        toneRing[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <Icon
            className="h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-gold"
            strokeWidth={1.75}
          />
        )}
      </div>

      <div className="mt-2 font-display text-[26px] font-semibold leading-none tabular-nums text-foreground">
        {value}
      </div>

      {(hint || delta) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 font-medium tabular-nums",
                delta.direction === "up" &&
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                delta.direction === "down" &&
                  "border-destructive/30 bg-destructive/10 text-destructive",
                delta.direction === "flat" && "border-border text-muted-foreground",
              )}
            >
              {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "—"}
              {delta.value}
            </span>
          )}
          {hint && <span className="truncate">{hint}</span>}
        </div>
      )}

      {data.length > 1 && (
        <div className="-mx-4 -mb-4 mt-3 h-10 opacity-80 transition-opacity duration-150 group-hover:opacity-100">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--gold)"
                strokeWidth={1.5}
                fill={`url(#${id})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Root>
  );
}
