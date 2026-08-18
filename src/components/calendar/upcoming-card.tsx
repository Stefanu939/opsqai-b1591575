import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { listCalendar } from "@/lib/calendar.functions";
import { CalendarMonth } from "./calendar-month";
import { KIND_STYLE, formatEventTime, type CalendarEventDTO } from "./types";
import { cn } from "@/lib/utils";

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
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());

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

      <CalendarMonth
        cursor={cursor}
        onCursorChange={setCursor}
        selected={selected}
        onSelect={setSelected}
        events={events}
        compact
      />

      <div className="mt-3 space-y-1.5">
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
