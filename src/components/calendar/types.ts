export type CalendarEventKind =
  | "meeting"
  | "renewal"
  | "maintenance"
  | "release"
  | "deadline"
  | "training"
  | "other";

export interface CalendarEventDTO {
  id: string;
  title: string;
  description: string | null;
  kind: CalendarEventKind;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  source: "stored" | "derived";
  ref: string | null;
}

export const KIND_STYLE: Record<CalendarEventKind, { chip: string; label: string; dot: string }> = {
  meeting: {
    chip: "bg-[var(--gold-soft)] text-[color:var(--gold)]",
    label: "Meeting",
    dot: "bg-[color:var(--gold)]",
  },
  renewal: {
    chip: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    label: "Renewal",
    dot: "bg-emerald-500",
  },
  maintenance: {
    chip: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    label: "Maintenance",
    dot: "bg-amber-500",
  },
  release: {
    chip: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
    label: "Release",
    dot: "bg-sky-500",
  },
  deadline: {
    chip: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    label: "Deadline",
    dot: "bg-rose-500",
  },
  training: {
    chip: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    label: "Training",
    dot: "bg-violet-500",
  },
  other: {
    chip: "bg-secondary text-muted-foreground",
    label: "Other",
    dot: "bg-muted-foreground",
  },
};

export const KIND_KEYS: CalendarEventKind[] = [
  "meeting",
  "renewal",
  "maintenance",
  "release",
  "deadline",
  "training",
  "other",
];

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** 42-cell Monday-first grid covering the month of `cursor`. */
export function startOfMonthGrid(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const shift = (first.getDay() + 6) % 7; // Monday-first
  const start = new Date(first);
  start.setDate(first.getDate() - shift);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function formatEventTime(e: CalendarEventDTO) {
  const start = new Date(e.starts_at);
  if (e.all_day) return "All day";
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  const from = start.toLocaleTimeString(undefined, opts);
  if (!e.ends_at) return from;
  return `${from} – ${new Date(e.ends_at).toLocaleTimeString(undefined, opts)}`;
}

export function toLocalInputValue(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
