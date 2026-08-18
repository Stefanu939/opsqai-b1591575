import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { listCalendar } from "@/lib/calendar.functions";
import {
  KIND_STYLE,
  formatEventTime,
  monthLabel,
  sameDay,
  startOfMonthGrid,
  type CalendarEventDTO,
} from "./types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Compact dashboard rail widget: mini month grid + the next few events.
 * Shared by the Management Center overview and the Customer Portal overview.
 */
export function UpcomingCard({
  scope,
  to,
  className,
}: {
  scope: "platform" | "portal";
  to: string;
  className?: string;
}) {
  const list = useServerFn(listCalendar);
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const range = useMemo(() => {
    const now = Date.now();
    return {
      from: new Date(now - 31 * 86400000).toISOString(),
      to: new Date(now + 120 * 86400000).toISOString(),
    };
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["calendar-upcoming", scope, range.from],
    queryFn: () => list({ data: { ...range, scope } } as never),
  });

  const events: CalendarEventDTO[] = data?.events ?? [];
  const days = useMemo(() => startOfMonthGrid(cursor), [cursor]);
  const hasEvent = (d: Date) => events.some((e) => sameDay(new Date(e.starts_at), d));

  const upcoming = useMemo(() => {
    const now = Date.now() - 6 * 3600000;
    return events
      .filter((e) => new Date(e.starts_at).getTime() >= now)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .slice(0, 4);
  }, [events]);

  return (
    <div className={cn("oq-soft-card p-4 md:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-[var(--gold-soft)] text-[color:var(--gold)]">
            <CalendarDays className="h-3.5 w-3.5" />
          </span>
          Calendar
        </h2>
        <Link
          to={to}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Open →
        </Link>
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{monthLabel(cursor)}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={`${w}-${i}`} className="text-[10px] text-muted-foreground/70">
            {w}
          </span>
        ))}
        {days.map((d) => {
          const outside = d.getMonth() !== cursor.getMonth();
          const isToday = sameDay(d, today);
          return (
            <span
              key={d.toISOString()}
              className={cn(
                "relative grid h-7 place-items-center rounded-lg text-[11px] tabular-nums",
                outside ? "text-muted-foreground/40" : "text-foreground",
                isToday &&
                  "bg-[color:var(--gold)] font-semibold text-[color:var(--gold-foreground)]",
              )}
            >
              {d.getDate()}
              {hasEvent(d) && !isToday && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[color:var(--gold)]" />
              )}
            </span>
          );
        })}
      </div>

      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
          Upcoming
        </div>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing scheduled ahead.</p>
        ) : (
          upcoming.map((e) => (
            <div key={`${e.id}-${e.starts_at}`} className="flex items-start gap-2">
              <span
                className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", KIND_STYLE[e.kind].dot)}
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-foreground">{e.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(e.starts_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {formatEventTime(e)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
