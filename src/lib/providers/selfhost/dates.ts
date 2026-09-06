// Self-Hosted date normalization helpers (server + shared).
//
// node-postgres decodes timestamps into `Date` objects by default, but the
// parsers are process-global and any module may replace them. To keep every
// repository robust we (a) pin the parsers per connection pool and (b) convert
// row values through `toIso`, which accepts a Date, a text timestamp or a
// numeric epoch.

const DATE_OIDS = new Set([
  1082, // date
  1114, // timestamp
  1184, // timestamptz
]);

/** Per-pool `types` override so timestamps always arrive as Date objects. */
export const pgDateTypes = {
  getTypeParser(oid: number, format?: unknown) {
    if (DATE_OIDS.has(oid)) {
      return (value: string | null) => (value === null ? null : new Date(value));
    }
    // Fall back to node-postgres' own parser for every other type.
    // Imported lazily to avoid pulling `pg` into non-server bundles.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const { types } = require("pg") as typeof import("pg");
    return (types.getTypeParser as (o: number, f?: unknown) => (v: string) => unknown)(
      oid,
      format,
    );
  },
};

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

/** Same as `toIso`, but keeps null/undefined as null. */
export function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return toIso(value);
}
