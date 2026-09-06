// Self-Hosted date normalization helpers (pure, no database imports).
//
// node-postgres decodes timestamps into `Date` objects by default, but the
// parsers are process-global and any module may replace them. To keep every
// repository robust we (a) pin the parsers per connection pool (see
// `pg-types.server.ts`) and (b) convert row values through `toIso`, which
// accepts a Date, a text timestamp or a numeric epoch.

/** Convert a database timestamp (Date, text or epoch) to an ISO string. */
export function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  return new Date(0).toISOString();
}

/** Same as `toIso`, but keeps null/undefined/empty as null. */
export function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return toIso(value);
}

/**
 * Convert a database `date` value (Date object, "YYYY-MM-DD" text or epoch)
 * into a calendar day string "YYYY-MM-DD". node-postgres decodes `date`
 * columns into Date objects, so `String(row.starts_on).slice(0, 10)` would
 * produce "Wed Oct 14" and any later Date parsing would fail.
 */
export function toDateOnly(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return toDateOnly(parsed);
    return value.slice(0, 10);
  }
  if (typeof value === "number") return toDateOnly(new Date(value));
  return "";
}
