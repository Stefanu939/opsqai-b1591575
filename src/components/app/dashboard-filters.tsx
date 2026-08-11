import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, RotateCcw } from "lucide-react";

export type RangeKey = "7d" | "30d" | "90d";
export type BucketKey = "hour" | "day" | "week";
export type WidgetId = "kpis" | "health" | "activity" | "insights" | "topSops" | "criticalSops";

export const WIDGETS: { id: WidgetId; label: string }[] = [
  { id: "kpis", label: "KPI cards" },
  { id: "health", label: "Workspace health" },
  { id: "activity", label: "Activity trend" },
  { id: "insights", label: "Executive insights" },
  { id: "topSops", label: "Top SOPs" },
  { id: "criticalSops", label: "Critical SOPs" },
];

export const RANGES: { id: RangeKey; label: string; days: number }[] = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
];

const BUCKETS: { id: BucketKey; label: string }[] = [
  { id: "hour", label: "Hourly" },
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
];

export type DashboardFilterState = {
  range: RangeKey;
  bucket: BucketKey;
  widgets: WidgetId[];
};

export const DEFAULT_FILTERS: DashboardFilterState = {
  range: "30d",
  bucket: "day",
  widgets: WIDGETS.map((w) => w.id),
};

export function rangeToWindow(range: RangeKey) {
  const days = RANGES.find((r) => r.id === range)?.days ?? 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Dashboard widget filters — time window, bucket granularity and which
 * widgets render. Purely presentational: the parent owns persistence.
 */
export function DashboardFilters({
  value,
  onChange,
}: {
  value: DashboardFilterState;
  onChange: (next: DashboardFilterState) => void;
}) {
  const toggleWidget = (id: WidgetId) => {
    const on = value.widgets.includes(id);
    onChange({
      ...value,
      widgets: on ? value.widgets.filter((w) => w !== id) : [...value.widgets, id],
    });
  };

  const hidden = WIDGETS.length - value.widgets.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-md border border-border bg-card p-0.5">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={value.range === r.id}
            onClick={() => onChange({ ...value, range: r.id })}
            className={cn(
              "rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors",
              value.range === r.id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="inline-flex rounded-md border border-border bg-card p-0.5">
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            type="button"
            aria-pressed={value.bucket === b.id}
            onClick={() => onChange({ ...value, bucket: b.id })}
            className={cn(
              "rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors",
              value.bucket === b.id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {b.label}
          </button>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Widgets
            {hidden > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
                {hidden} hidden
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Visible widgets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {WIDGETS.map((w) => (
            <DropdownMenuCheckboxItem
              key={w.id}
              checked={value.widgets.includes(w.id)}
              onCheckedChange={() => toggleWidget(w.id)}
              onSelect={(e) => e.preventDefault()}
            >
              {w.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => onChange(DEFAULT_FILTERS)}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>
    </div>
  );
}
