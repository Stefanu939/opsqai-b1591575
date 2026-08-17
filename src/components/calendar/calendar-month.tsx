import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEventDTO } from "./types";
import { KIND_STYLE, sameDay, startOfMonthGrid, monthLabel } from "./types";

/**
 * Month grid used by the dedicated calendar pages. Purely presentational —
 * event data and mutations are owned by the route.
 */
export function CalendarMonth({
  events,
  selected,
  onSelect,
  onCreate,
}: {
  events: CalendarEventDTO[];
  selected: Date;
  onSelect: (d: Date) => void;
  onCreate?: (d: Date) => void;
}) {
  const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const days = useMemo(() => startOfMonthGrid(cursor), [cursor]);
  const today = new Date();

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEventDTO[]>();
    for (const e of events) {
      const d = new Date(e.starts_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events]);

  const dayEvents = (d: Date) => byDay.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) ?? [];

  return (
    <div className="oq-soft-card p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-foreground">
            {monthLabel(cursor)}
          </h2>
          <p className="text-xs text-muted-foreground">
            {events.length} event{events.length === 1 ? "" : "s"} in view
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
              onSelect(today);
            }}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = sameDay(d, today);
          const isSelected = sameDay(d, selected);
          const list = dayEvents(d);
          return (
            <button
              type="button"
              key={d.toISOString()}
              onClick={() => onSelect(d)}
              onDoubleClick={() => onCreate?.(d)}
              className={cn(
                "min-h-[84px] rounded-2xl border p-2 text-left transition",
                inMonth ? "border-border bg-secondary/40" : "border-transparent opacity-45",
                isSelected
                  ? "border-[color:var(--gold)] bg-[var(--gold-soft)]"
                  : "hover:border-[color:var(--gold-line)] hover:bg-secondary",
              )}
            >
              <span
                className={cn(
                  "inline-grid h-6 w-6 place-items-center rounded-full text-xs tabular-nums",
                  isToday
                    ? "bg-[color:var(--gold)] font-semibold text-[color:var(--gold-foreground)]"
                    : "text-muted-foreground",
                )}
              >
                {d.getDate()}
              </span>
              <span className="mt-1 block space-y-1">
                {list.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    className={cn(
                      "block truncate rounded-lg px-1.5 py-0.5 text-[10px] font-medium",
                      KIND_STYLE[e.kind]?.chip ?? "bg-secondary text-muted-foreground",
                    )}
                  >
                    {e.title}
                  </span>
                ))}
                {list.length > 2 && (
                  <span className="block text-[10px] text-muted-foreground">
                    +{list.length - 2} more
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
