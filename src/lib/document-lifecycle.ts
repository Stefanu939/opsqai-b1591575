/**
 * Knowledge document lifecycle helpers (pure, browser-safe).
 *
 * A document's *freshness* is derived from when its information was last
 * refreshed (`information_updated_at`, falling back to `updated_at` /
 * `created_at`) and from its review cadence. The AI Audit, the Knowledge
 * library and the dashboard all render the same vocabulary, so the maths
 * lives here once.
 */

export const DEFAULT_REVIEW_INTERVAL_DAYS = 365;

export type LifecycleState = "fresh" | "review_soon" | "outdated" | "unreviewed";

export interface LifecycleSource {
  created_at?: string | null;
  updated_at?: string | null;
  information_updated_at?: string | null;
  last_reviewed_at?: string | null;
  review_interval_days?: number | null;
}

export interface Lifecycle {
  /** Timestamp the freshness maths is based on (ISO string) or null. */
  basis: string | null;
  /** Whole days since `basis`; null when unknown. */
  ageDays: number | null;
  /** Review cadence in days actually applied. */
  intervalDays: number;
  /** Days until the next review is due; negative = overdue. */
  dueInDays: number | null;
  state: LifecycleState;
  label: string;
  /** Human age, e.g. "3 months old". */
  ageLabel: string;
}

const DAY = 86_400_000;

function toTime(value?: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

export function informationDate(doc: LifecycleSource): string | null {
  return doc.information_updated_at ?? doc.updated_at ?? doc.created_at ?? null;
}

export function formatAgeLabel(ageDays: number | null): string {
  if (ageDays === null) return "Age unknown";
  if (ageDays <= 0) return "Updated today";
  if (ageDays === 1) return "1 day old";
  if (ageDays < 31) return `${ageDays} days old`;
  const months = Math.round(ageDays / 30.44);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} old`;
  const years = Math.floor(ageDays / 365);
  const rest = Math.round((ageDays - years * 365) / 30.44);
  return rest > 0
    ? `${years}y ${rest}m old`
    : `${years} year${years === 1 ? "" : "s"} old`;
}

export function documentLifecycle(
  doc: LifecycleSource,
  now: Date = new Date(),
): Lifecycle {
  const intervalDays =
    doc.review_interval_days && doc.review_interval_days > 0
      ? doc.review_interval_days
      : DEFAULT_REVIEW_INTERVAL_DAYS;

  const basis = informationDate(doc);
  const basisTime = toTime(basis);
  const ageDays =
    basisTime === null ? null : Math.max(0, Math.floor((now.getTime() - basisTime) / DAY));

  const reviewTime = toTime(doc.last_reviewed_at) ?? basisTime;
  const dueInDays =
    reviewTime === null
      ? null
      : Math.round((reviewTime + intervalDays * DAY - now.getTime()) / DAY);

  let state: LifecycleState = "fresh";
  if (dueInDays === null) state = "unreviewed";
  else if (dueInDays < 0) state = "outdated";
  else if (dueInDays <= 30) state = "review_soon";

  const label =
    state === "outdated"
      ? `Review overdue by ${Math.abs(dueInDays ?? 0)}d`
      : state === "review_soon"
        ? `Review due in ${dueInDays}d`
        : state === "unreviewed"
          ? "Never reviewed"
          : "Up to date";

  return {
    basis,
    ageDays,
    intervalDays,
    dueInDays,
    state,
    label,
    ageLabel: formatAgeLabel(ageDays),
  };
}

/** Tailwind token classes for a lifecycle badge — semantic tokens only. */
export function lifecycleBadgeClass(state: LifecycleState): string {
  switch (state) {
    case "outdated":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    case "review_soon":
      return "border-primary/40 bg-primary/10 text-primary";
    case "unreviewed":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
}

export interface LifecycleSummary {
  total: number;
  fresh: number;
  reviewSoon: number;
  outdated: number;
  unreviewed: number;
  /** Median age in days across documents with a known basis. */
  medianAgeDays: number | null;
}

export function summarizeLifecycle(
  docs: LifecycleSource[],
  now: Date = new Date(),
): LifecycleSummary {
  const ages: number[] = [];
  const summary: LifecycleSummary = {
    total: docs.length,
    fresh: 0,
    reviewSoon: 0,
    outdated: 0,
    unreviewed: 0,
    medianAgeDays: null,
  };
  for (const doc of docs) {
    const lc = documentLifecycle(doc, now);
    if (lc.ageDays !== null) ages.push(lc.ageDays);
    if (lc.state === "outdated") summary.outdated += 1;
    else if (lc.state === "review_soon") summary.reviewSoon += 1;
    else if (lc.state === "unreviewed") summary.unreviewed += 1;
    else summary.fresh += 1;
  }
  if (ages.length > 0) {
    ages.sort((a, b) => a - b);
    const mid = Math.floor(ages.length / 2);
    summary.medianAgeDays =
      ages.length % 2 === 0 ? Math.round((ages[mid - 1] + ages[mid]) / 2) : ages[mid];
  }
  return summary;
}
