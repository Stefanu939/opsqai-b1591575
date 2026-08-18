import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  CalendarPlus,
  Check,
  Copy,
  Link2,
  Mail,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteCalendarEvent,
  getCalendarFeed,
  listCalendar,
  upsertCalendarEvent,
} from "@/lib/calendar.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarMonth } from "./calendar-month";
import {
  KIND_KEYS,
  KIND_STYLE,
  formatEventTime,
  sameDay,
  toLocalInputValue,
  type CalendarEventDTO,
  type CalendarEventKind,
} from "./types";
import { cn } from "@/lib/utils";

type Draft = {
  id?: string;
  title: string;
  description: string;
  kind: CalendarEventKind;
  location: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
};

function emptyDraft(day: Date): Draft {
  const start = new Date(day);
  if (start.getHours() === 0) start.setHours(9, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    description: "",
    kind: "meeting",
    location: "",
    starts_at: toLocalInputValue(start),
    ends_at: toLocalInputValue(end),
    all_day: false,
  };
}

export function CalendarPanel({ scope }: { scope: "platform" | "portal" }) {
  const qc = useQueryClient();
  const list = useServerFn(listCalendar);
  const upsert = useServerFn(upsertCalendarEvent);
  const remove = useServerFn(deleteCalendarEvent);
  const feed = useServerFn(getCalendarFeed);

  const [selected, setSelected] = useState(() => new Date());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [copied, setCopied] = useState(false);

  const eventsQ = useQuery({
    queryKey: ["calendar", scope],
    queryFn: () => list({ data: { scope } } as never),
  });
  const feedQ = useQuery({
    queryKey: ["calendar-feed", scope],
    queryFn: () => feed({ data: {} } as never),
  });

  const events: CalendarEventDTO[] = (eventsQ.data?.events ?? []) as CalendarEventDTO[];

  const save = useMutation({
    mutationFn: (d: Draft) =>
      upsert({
        data: {
          id: d.id,
          title: d.title,
          description: d.description || null,
          kind: d.kind,
          location: d.location || null,
          starts_at: new Date(d.starts_at).toISOString(),
          ends_at: d.all_day || !d.ends_at ? null : new Date(d.ends_at).toISOString(),
          all_day: d.all_day,
          scope,
        },
      } as never),
    onSuccess: () => {
      toast.success("Event saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["calendar", scope] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } } as never),
    onSuccess: () => {
      toast.success("Event removed");
      qc.invalidateQueries({ queryKey: ["calendar", scope] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rotate = useMutation({
    mutationFn: () => feed({ data: { rotate: true } } as never),
    onSuccess: () => {
      toast.success("Subscription link rotated");
      qc.invalidateQueries({ queryKey: ["calendar-feed", scope] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dayEvents = useMemo(
    () => events.filter((e) => sameDay(new Date(e.starts_at), selected)),
    [events, selected],
  );
  const upcoming = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => new Date(e.starts_at).getTime() >= now - 3600_000).slice(0, 8);
  }, [events]);

  const feedUrl = calendarFeedUrl(feedQ.data?.token);
  const webcalUrl = calendarWebcalUrl(feedUrl);
  const googleUrl = calendarGoogleUrl(feedUrl);
  const outlookWebUrl = calendarOutlookWebUrl(feedUrl, true);
  const outlookLiveUrl = calendarOutlookWebUrl(feedUrl, false);


  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button className="rounded-full" onClick={() => setDraft(emptyDraft(selected))}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            New event
          </Button>
          <span className="text-xs text-muted-foreground">
            Double-click a day to add an event there.
          </span>
        </div>

        <CalendarMonth
          events={events}
          selected={selected}
          onSelect={setSelected}
          onCreate={(d) => setDraft(emptyDraft(d))}
        />

        <div className="oq-soft-card p-4 md:p-5">
          <h3 className="font-display mb-3 text-sm font-semibold text-foreground">
            {selected.toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled for this day.</p>
          ) : (
            <ul className="space-y-2">
              {dayEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-3"
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", KIND_STYLE[e.kind].dot)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatEventTime(e)} · {KIND_STYLE[e.kind].label}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                    {e.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{e.description}</p>
                    )}
                    {e.ref && (
                      <Link
                        to={e.ref as never}
                        className="mt-1 inline-flex text-xs font-medium text-[color:var(--gold)] hover:underline"
                      >
                        Open record →
                      </Link>
                    )}
                  </div>
                  {e.source === "stored" && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() =>
                          setDraft({
                            id: e.id,
                            title: e.title,
                            description: e.description ?? "",
                            kind: e.kind,
                            location: e.location ?? "",
                            starts_at: toLocalInputValue(new Date(e.starts_at)),
                            ends_at: e.ends_at ? toLocalInputValue(new Date(e.ends_at)) : "",
                            all_day: e.all_day,
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-destructive"
                        onClick={() => del.mutate(e.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right rail */}
      <div className="min-w-0 space-y-4">
        <div className="oq-soft-card p-4 md:p-5">
          <h3 className="font-display mb-3 text-sm font-semibold text-foreground">Upcoming</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {eventsQ.isLoading ? "Loading…" : "No upcoming events."}
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary text-center leading-none">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {new Date(e.starts_at).toLocaleDateString(undefined, { month: "short" })}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {new Date(e.starts_at).getDate()}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{e.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatEventTime(e)} · {KIND_STYLE[e.kind].label}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="oq-soft-card p-4 md:p-5">
          <div className="mb-1 flex items-center gap-2">
            <Mail className="h-4 w-4 text-[color:var(--gold)]" />
            <h3 className="font-display text-sm font-semibold text-foreground">
              Outlook &amp; Google
            </h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Subscribe once — renewals, releases and your own events keep syncing automatically.
          </p>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/50 px-3 py-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              readOnly
              value={feedUrl}
              className="min-w-0 flex-1 bg-transparent text-[11px] text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              aria-label="Copy subscription link"
              onClick={async () => {
                await navigator.clipboard.writeText(feedUrl);
                setCopied(true);
                toast.success("Link copied");
                setTimeout(() => setCopied(false), 1500);
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            <a
              href={webcalUrl || "#"}
              className="oq-pill flex items-center justify-center border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary"
            >
              Add to Outlook / Apple Calendar
            </a>
            <a
              href={googleUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="oq-pill flex items-center justify-center border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary"
            >
              Add to Google Calendar
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-muted-foreground"
              onClick={() => rotate.mutate()}
              disabled={rotate.isPending}
            >
              <RefreshCw className={cn("mr-2 h-3.5 w-3.5", rotate.isPending && "animate-spin")} />
              Rotate link
            </Button>
          </div>
        </div>

        <div className="oq-soft-card p-4 md:p-5">
          <h3 className="font-display mb-2 text-sm font-semibold text-foreground">Legend</h3>
          <div className="flex flex-wrap gap-1.5">
            {KIND_KEYS.map((k) => (
              <span
                key={k}
                className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", KIND_STYLE[k].chip)}
              >
                {KIND_STYLE[k].label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit event" : "New event"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cal-title">Title</Label>
                <Input
                  id="cal-title"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Quarterly review with Acme"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <div className="flex flex-wrap gap-1.5">
                  {KIND_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setDraft({ ...draft, kind: k })}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                        draft.kind === k
                          ? "border-[color:var(--gold)] bg-[var(--gold-soft)] text-[color:var(--gold)]"
                          : "border-border text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      {KIND_STYLE[k].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-3 py-2">
                <Label htmlFor="cal-allday" className="text-sm">
                  All day
                </Label>
                <Switch
                  id="cal-allday"
                  checked={draft.all_day}
                  onCheckedChange={(v) => setDraft({ ...draft, all_day: v })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cal-start">Starts</Label>
                  <Input
                    id="cal-start"
                    type="datetime-local"
                    value={draft.starts_at}
                    onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })}
                  />
                </div>
                {!draft.all_day && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cal-end">Ends</Label>
                    <Input
                      id="cal-end"
                      type="datetime-local"
                      value={draft.ends_at}
                      onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cal-loc">Location</Label>
                <Input
                  id="cal-loc"
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  placeholder="Teams call, Berlin office…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cal-desc">Notes</Label>
                <Textarea
                  id="cal-desc"
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" className="rounded-full" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-full"
              disabled={!draft?.title.trim() || save.isPending}
              onClick={() => draft && save.mutate(draft)}
            >
              {save.isPending ? "Saving…" : "Save event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
