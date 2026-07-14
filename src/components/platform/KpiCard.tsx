import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  eyebrow: string;
  value: string;
  trend?: number;
  icon: LucideIcon;
  spark?: Array<{ v: number }>;
  hint?: string;
  hoverTitle?: string;
  hoverBody?: string;
}

export function KpiCard({
  eyebrow,
  value,
  trend,
  icon: Icon,
  spark,
  hint,
  hoverTitle,
  hoverBody,
}: KpiCardProps) {
  const t = trend ?? 0;
  const TrendIcon = t > 0 ? TrendingUp : t < 0 ? TrendingDown : Minus;
  const trendColor =
    t > 0
      ? "text-[var(--mc-success)]"
      : t < 0
        ? "text-[var(--mc-danger)]"
        : "text-[var(--mc-fg-muted)]";

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <div className="mc-surface mc-surface-hover mc-hairline group relative overflow-hidden p-4 cursor-help">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mc-eyebrow flex items-center gap-1.5">
                <Icon className="h-3 w-3 text-[var(--mc-gold)]" />
                {eyebrow}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <div className="mc-num mc-gold-text text-2xl font-bold tracking-tight">
                  {value}
                </div>
                {typeof trend === "number" && (
                  <div className={cn("mc-num flex items-center gap-0.5 text-xs font-medium", trendColor)}>
                    <TrendIcon className="h-3 w-3" />
                    {Math.abs(t)}%
                  </div>
                )}
              </div>
              {hint && (
                <div className="mt-1 text-[11px] text-[var(--mc-fg-muted)]">{hint}</div>
              )}
            </div>
          </div>
          {spark && spark.length > 1 && (
            <div className="mt-3 h-10 -mx-1 -mb-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spark}>
                  <defs>
                    <linearGradient id={`spark-${eyebrow.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#7c5cff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      background: "#1a1a3d",
                      border: "1px solid rgba(124,92,255,0.4)",
                      borderRadius: 6,
                      fontSize: 11,
                      color: "#e8e8ff",
                    }}
                    labelStyle={{ display: "none" }}
                    cursor={{ stroke: "#7c5cff", strokeWidth: 1, strokeDasharray: "2 2" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="#7c5cff"
                    strokeWidth={1.5}
                    fill={`url(#spark-${eyebrow.replace(/\s/g, "")})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </HoverCardTrigger>
      {(hoverTitle || hoverBody) && (
        <HoverCardContent
          side="bottom"
          align="start"
          className="w-72 border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-3)] text-[var(--mc-fg)]"
        >
          {hoverTitle && (
            <div className="mc-eyebrow mb-1 text-[var(--mc-gold-glow)]">{hoverTitle}</div>
          )}
          {hoverBody && (
            <p className="text-xs leading-relaxed text-[var(--mc-fg-muted)]">{hoverBody}</p>
          )}
        </HoverCardContent>
      )}
    </HoverCard>
  );
}
