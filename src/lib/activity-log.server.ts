// Self-Hosted activity log reader (append-only public.audit_log).
// Reads the installation's local PostgreSQL through DATABASE_URL.

import { Pool } from "pg";
import { pgDateTypes } from "@/lib/providers/selfhost/pg-types.server";

let pool: Pool | null = null;
function getPool(): Pool {
  if (pool) return pool;
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("The activity log is available on Self-Hosted installations only.");
  pool = new Pool({ connectionString: cs, types: pgDateTypes, max: 3 });
  return pool;
}

export interface ActivityFilters {
  q?: string;
  action?: string;
  actor?: string;
  severity?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}

export interface ActivityRow {
  id: string;
  at: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  target: string | null;
  module: string | null;
  severity: string | null;
  success: boolean | null;
  detail: string;
}

function where(f: ActivityFilters) {
  const c: string[] = [];
  const v: unknown[] = [];
  const add = (sql: string, val: unknown) => {
    v.push(val);
    c.push(sql.replace("?", `$${v.length}`));
  };
  if (f.q) add("(a.action ILIKE ? OR a.target ILIKE $X OR a.detail::text ILIKE $X)".replace(/\$X/g, `$${v.length + 1}`), `%${f.q}%`);
  if (f.action) add("a.action ILIKE ?", `${f.action}%`);
  if (f.actor) add("(u.email ILIKE ? OR u.display_name ILIKE $X)".replace(/\$X/g, `$${v.length + 1}`), `%${f.actor}%`);
  if (f.severity) add("a.detail->>'severity' = ?", f.severity);
  if (f.from) add("a.at >= ?::timestamptz", f.from);
  if (f.to) add("a.at < (?::date + 1)", f.to);
  return { sql: c.length ? `WHERE ${c.join(" AND ")}` : "", values: v };
}

export async function listActivity(f: ActivityFilters) {
  const w = where(f);
  const p = getPool();
  const { rows } = await p.query(
    `SELECT a.id::text, a.at, a.actor_id, u.display_name, u.email, a.action, a.target, a.detail
       FROM public.audit_log a LEFT JOIN public.users u ON u.id = a.actor_id
       ${w.sql}
      ORDER BY a.at DESC, a.id DESC
      LIMIT ${Math.min(f.limit, 500)} OFFSET ${Math.max(0, f.offset)}`,
    w.values,
  );
  const { rows: cnt } = await p.query(
    `SELECT count(*)::int AS n FROM public.audit_log a LEFT JOIN public.users u ON u.id = a.actor_id ${w.sql}`,
    w.values,
  );
  const items: ActivityRow[] = rows.map((r) => {
    const d = (r.detail ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      at: r.at instanceof Date ? r.at.toISOString() : String(r.at),
      actorId: r.actor_id,
      actorName: r.display_name,
      actorEmail: r.email,
      action: r.action,
      target: r.target,
      module: typeof d["module"] === "string" ? d["module"] : null,
      severity: typeof d["severity"] === "string" ? d["severity"] : null,
      success: typeof d["success"] === "boolean" ? d["success"] : null,
      detail: JSON.stringify(d),
    };
  });
  return { items, total: cnt[0]?.n ?? 0 };
}

function csvCell(s: unknown) {
  const t = s == null ? "" : String(s);
  return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** Export of the filtered log for the company's own auditors. */
export async function exportActivityCsv(f: ActivityFilters) {
  const { items } = await listActivity({ ...f, limit: 500, offset: 0 });
  const head = ["at", "user", "email", "action", "target", "module", "severity", "success", "detail"];
  const lines = items.map((r) =>
    [r.at, r.actorName, r.actorEmail, r.action, r.target, r.module, r.severity, r.success, r.detail]
      .map(csvCell)
      .join(","),
  );
  return [head.join(","), ...lines].join("\n");
}
