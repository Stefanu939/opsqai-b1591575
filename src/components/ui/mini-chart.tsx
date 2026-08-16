import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const axis = {
  stroke: "var(--border)",
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
};

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--card-foreground)",
} as const;

export const CHART_TONES = [
  "var(--primary)",
  "var(--gold)",
  "var(--primary-glow)",
  "color-mix(in oklab, var(--gold) 55%, var(--primary))",
  "color-mix(in oklab, var(--primary) 45%, var(--muted-foreground))",
];

/** Area trend — activity over time. */
export function AreaTrend({
  data,
  xKey,
  yKey,
  height = 220,
  className,
}: {
  data: readonly Record<string, unknown>[] | readonly object[];
  xKey: string;
  yKey: string;
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data as Record<string, unknown>[]} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="oq-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={xKey} {...axis} tickLine={false} />
          <YAxis {...axis} tickLine={false} allowDecimals={false} width={38} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#oq-area)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Line trend — scores over time. */
export function LineTrend({
  data,
  xKey,
  yKey,
  height = 200,
  className,
}: {
  data: readonly Record<string, unknown>[] | readonly object[];
  xKey: string;
  yKey: string;
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data as Record<string, unknown>[]} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={xKey} {...axis} tickLine={false} />
          <YAxis {...axis} tickLine={false} width={38} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke="var(--gold)"
            strokeWidth={2}
            dot={{ r: 2, fill: "var(--gold)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal-ish category bars — per-department / per-category counts. */
export function CategoryBars({
  data,
  xKey,
  yKey,
  height = 200,
  className,
}: {
  data: readonly Record<string, unknown>[] | readonly object[];
  xKey: string;
  yKey: string;
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data as Record<string, unknown>[]} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={xKey} {...axis} tickLine={false} interval={0} />
          <YAxis {...axis} tickLine={false} allowDecimals={false} width={38} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey={yKey} radius={[6, 6, 0, 0]}>
            {(data as unknown[]).map((_, i) => (
              <Cell key={i} fill={CHART_TONES[i % CHART_TONES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut breakdown — health/status splits. */
export function DonutBreakdown({
  data,
  nameKey,
  valueKey,
  height = 200,
  className,
}: {
  data: readonly Record<string, unknown>[] | readonly object[];
  nameKey: string;
  valueKey: string;
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip contentStyle={tooltipStyle} />
          <Pie
            data={data as Record<string, unknown>[]}
            dataKey={valueKey}
            nameKey={nameKey}
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="var(--card)"
          >
            {(data as unknown[]).map((_, i) => (
              <Cell key={i} fill={CHART_TONES[i % CHART_TONES.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({
  items,
  className,
}: {
  items: Array<{ label: string; value?: number | string }>;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs", className)}>
      {items.map((it, i) => (
        <li key={it.label} className="flex items-center gap-1.5 text-muted-foreground">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ background: CHART_TONES[i % CHART_TONES.length] }}
          />
          <span className="text-foreground">{it.label}</span>
          {it.value !== undefined && <span className="tabular-nums">{it.value}</span>}
        </li>
      ))}
    </ul>
  );
}
