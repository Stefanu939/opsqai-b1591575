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
