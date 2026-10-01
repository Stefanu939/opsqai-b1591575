// Self-Hosted GDPR tooling: right to erasure (pseudonymisation) and
// automatic retention of AI chat history. The append-only audit_log is
// never modified — its actor_id now resolves to an anonymised user row.

import { Pool } from "pg";
import { pgDateTypes } from "@/lib/providers/selfhost/pg-types.server";

let pool: Pool | null = null;
function getPool(): Pool {
  if (pool) return pool;
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("Privacy tools are available on Self-Hosted installations only.");
  pool = new Pool({ connectionString: cs, types: pgDateTypes, max: 2 });
  return pool;
}

async function audit(actorId: string | null, action: string, target: string, detail: object) {
  await getPool()
    .query(
      `INSERT INTO public.audit_log (actor_id, action, target, detail) VALUES ($1,$2,$3,$4::jsonb)`,
      [actorId, action, target, JSON.stringify({ module: "privacy", severity: "warning", success: true, ...detail })],
    )
    .catch(() => undefined);
}

async function optionalColumns(table: string, cols: string[]): Promise<string[]> {
  const { rows } = await getPool().query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 AND column_name = ANY($2::text[])`,
    [table, cols],
  );
  return rows.map((r) => r.column_name);
}

export async function anonymizeUser(userId: string, actorId: string) {
  if (userId === actorId) throw new Error("You cannot anonymise your own account.");
  const p = getPool();
  const tag = `ANON_USER_${userId.slice(0, 8)}`;
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const { rowCount: threads } = await client.query(`DELETE FROM public.threads WHERE user_id = $1`, [userId]);
    const present = await optionalColumns("users", [
      "display_name", "first_name", "last_name", "full_name", "phone", "position", "avatar_url", "password_hash",
    ]);
    const sets = [`email = $2`, `is_active = false`, `anonymized_at = now()`];
    for (const c of present) {
      if (c === "display_name" || c === "full_name") sets.push(`${c} = '${tag}'`);
      else if (c === "password_hash") sets.push(`${c} = NULL`);
      else sets.push(`${c} = NULL`);
    }
    const { rowCount } = await client.query(
      `UPDATE public.users SET ${sets.join(", ")} WHERE id = $1`,
      [userId, `${tag.toLowerCase()}@anonymized.invalid`],
    );
    if (!rowCount) throw new Error("User not found.");
    await client.query("COMMIT");
    await audit(actorId, "gdpr.anonymize", userId, { pseudonym: tag, threads_deleted: threads ?? 0 });
    return { pseudonym: tag, threadsDeleted: threads ?? 0 };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

export async function getRetention() {
  const { rows } = await getPool().query(
    `SELECT chat_retention_days, last_purge_at FROM public.privacy_settings WHERE id = 1`,
  );
  const r = rows[0] ?? {};
  return {
    chatRetentionDays: (r.chat_retention_days as number | null) ?? null,
    lastPurgeAt: r.last_purge_at ? new Date(r.last_purge_at as string).toISOString() : null,
  };
}

export async function setRetention(days: number | null, actorId: string) {
  await getPool().query(
    `INSERT INTO public.privacy_settings (id, chat_retention_days, updated_at) VALUES (1,$1,now())
     ON CONFLICT (id) DO UPDATE SET chat_retention_days = EXCLUDED.chat_retention_days, updated_at = now()`,
    [days],
  );
  await audit(actorId, "privacy.retention.update", "chat", { chat_retention_days: days });
  if (days) await purgeExpiredChats(actorId);
  return getRetention();
}

export async function purgeExpiredChats(actorId: string | null = null) {
  const { chatRetentionDays } = await getRetention();
  if (!chatRetentionDays) return 0;
  const { rowCount } = await getPool().query(
    `DELETE FROM public.threads WHERE updated_at < now() - ($1 || ' days')::interval`,
    [String(chatRetentionDays)],
  );
  await getPool().query(`UPDATE public.privacy_settings SET last_purge_at = now() WHERE id = 1`);
  if (rowCount) await audit(actorId, "privacy.retention.purge", "chat", { threads_deleted: rowCount, days: chatRetentionDays });
  return rowCount ?? 0;
}

let timer: ReturnType<typeof setInterval> | null = null;
export function startRetentionScheduler(): void {
  if (timer) return;
  const run = () => void purgeExpiredChats().catch(() => undefined);
  setTimeout(run, 60_000);
  timer = setInterval(run, 6 * 60 * 60 * 1000);
  (timer as { unref?: () => void }).unref?.();
}
