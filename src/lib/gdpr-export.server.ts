// Self-Hosted GDPR data-subject export (Art. 15 / Art. 20).
// Collects every row in the local database that belongs to one user, by
// scanning public tables for well-known ownership columns. Secret-looking
// columns (passwords, hashes, tokens, secrets) are never exported.

import { Pool } from "pg";
import { pgDateTypes } from "@/lib/providers/selfhost/pg-types.server";

let pool: Pool | null = null;
function getPool(): Pool {
  if (pool) return pool;
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("GDPR export is available on Self-Hosted installations only.");
  pool = new Pool({ connectionString: cs, types: pgDateTypes, max: 2 });
  return pool;
}

const OWNER_COLUMNS = [
  "user_id",
  "author_id",
  "created_by",
  "actor_id",
  "owner_id",
  "employee_user_id",
  "assignee_id",
  "learner_id",
];
const SECRET = /(password|hash|token|secret|otp|mfa|private_key|api_key)/i;
const SKIP_TABLES = new Set(["sessions", "login_throttle", "refresh_tokens"]);

export async function buildUserExport(userId: string) {
  const p = getPool();
  const { rows: userRows } = await p.query(`SELECT * FROM public.users WHERE id = $1`, [userId]);
  if (!userRows[0]) throw new Error("User not found.");
  const strip = (r: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(r).filter(([k]) => !SECRET.test(k)));

  const { rows: cols } = await p.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = ANY($1::text[])
        AND table_name <> 'users'
      ORDER BY table_name`,
    [OWNER_COLUMNS],
  );
  const byTable = new Map<string, string[]>();
  for (const c of cols) {
    if (SKIP_TABLES.has(c.table_name)) continue;
    byTable.set(c.table_name, [...(byTable.get(c.table_name) ?? []), c.column_name]);
  }

  const data: Record<string, unknown[]> = {};
  for (const [table, columns] of byTable) {
    const where = columns.map((c) => `"${c}"::text = $1`).join(" OR ");
    try {
      const { rows } = await p.query(
        `SELECT * FROM public."${table}" WHERE ${where} LIMIT 20000`,
        [userId],
      );
      if (rows.length) data[table] = rows.map(strip);
    } catch {
      /* table not readable — skipped */
    }
  }

  return {
    format: "opsqai.gdpr-export.v1",
    generated_at: new Date().toISOString(),
    legal_basis: "GDPR Art. 15 (access) and Art. 20 (data portability)",
    subject: strip(userRows[0]),
    tables: data,
  };
}
