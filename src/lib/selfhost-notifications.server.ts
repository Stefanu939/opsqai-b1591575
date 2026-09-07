// Self-Hosted notification inbox (server only).
//
// The Cloud bell reads the `notifications` table through Supabase. A local
// installation has no Supabase, so events land in `app_notifications` in the
// installation's own PostgreSQL database. Company-wide rows have user_id NULL;
// read state is per user.

import { Pool, type QueryResultRow } from "pg";
import { pgDateTypes } from "@/lib/providers/selfhost/pg-types.server";

let pool: Pool | null = null;

function getPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({
      connectionString,
      types: pgDateTypes,
      max: 3,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

async function q<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const p = getPool();
  if (!p) return [];
  const res = await p.query<T>(sql, params);
  return res.rows;
}

export interface LocalNotification {
  id: string;
  kind: string;
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** True when this process talks to a local installation database. */
export function localInboxAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Record an event. Never throws: a notification must not break the action. */
export async function emitLocalNotification(input: {
  companyId: string;
  userId?: string | null;
  kind: string;
  category?: string;
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<void> {
  try {
    await q(
      `INSERT INTO public.app_notifications
         (company_id, user_id, kind, category, title, body, link)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        input.companyId,
        input.userId ?? null,
        input.kind,
        input.category ?? "general",
        input.title,
        input.body ?? null,
        input.link ?? null,
      ],
    );
  } catch {
    // Table missing (migration not applied yet) or database unavailable.
  }
}

export async function listLocalNotifications(
  companyId: string,
  userId: string,
  limit = 40,
): Promise<LocalNotification[]> {
  try {
    const rows = await q<{
      id: string;
      kind: string;
      category: string;
      title: string;
      body: string | null;
      link: string | null;
      read_at: Date | string | null;
      created_at: Date | string;
    }>(
      `SELECT n.id, n.kind, n.category, n.title, n.body, n.link,
              r.read_at, n.created_at
         FROM public.app_notifications n
         LEFT JOIN public.app_notification_reads r
           ON r.notification_id = n.id AND r.user_id = $2
        WHERE n.company_id = $1 AND (n.user_id IS NULL OR n.user_id = $2)
        ORDER BY n.created_at DESC
        LIMIT $3`,
      [companyId, userId, limit],
    );
    return rows.map((row) => ({
      ...row,
      read_at: row.read_at ? new Date(row.read_at).toISOString() : null,
      created_at: new Date(row.created_at).toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function markLocalNotificationRead(
  id: string,
  userId: string,
  companyId: string,
): Promise<void> {
  // Company + recipient scoped: a stray id from another tenant is ignored.
  await q(
    `INSERT INTO public.app_notification_reads (notification_id, user_id)
     SELECT n.id, $2 FROM public.app_notifications n
      WHERE n.id = $1 AND n.company_id = $3
        AND (n.user_id IS NULL OR n.user_id = $2)
     ON CONFLICT DO NOTHING`,
    [id, userId, companyId],
  );
}

export async function markAllLocalNotificationsRead(
  companyId: string,
  userId: string,
): Promise<void> {
  await q(
    `INSERT INTO public.app_notification_reads (notification_id, user_id)
     SELECT n.id, $2 FROM public.app_notifications n
      WHERE n.company_id = $1 AND (n.user_id IS NULL OR n.user_id = $2)
     ON CONFLICT DO NOTHING`,
    [companyId, userId],
  );
}

/**
 * Record an event at most once per day per kind for a company. Used by the
 * daily risk digest (expiring documents, overdue audits) so opening the
 * overview does not flood the inbox.
 */
export async function emitLocalNotificationOnceToday(input: {
  companyId: string;
  kind: string;
  category?: string;
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<void> {
  try {
    const rows = await q<{ id: string }>(
      `SELECT id FROM public.app_notifications
        WHERE company_id = $1 AND kind = $2
          AND created_at >= date_trunc('day', now())
        LIMIT 1`,
      [input.companyId, input.kind],
    );
    if (rows.length) return;
  } catch {
    return;
  }
  await emitLocalNotification(input);
}
