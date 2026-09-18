// Self-Hosted → Management Center usage metrics (aggregate only).
//
// This module answers one question for OPSQAI: "how much, and how, was the
// installation used?" — without ever looking at what the customer wrote.
// Every query is a COUNT / AVG / MIN / MAX over a rolling window. No text
// column, no document title, no name, no e-mail, no id of a person is read
// or returned. Each block is individually guarded so an installation without
// an optional module simply contributes nothing.
//
// The result is attached to the periodic heartbeat, and only when the
// installation's telemetry level is not "disabled".

import type { Pool } from "pg";

export interface UsageMetrics {
  /** Rolling window in days the numbers cover. */
  window_days: number;
  users_total: number;
  users_active_7d: number;
  users_active_30d: number;
  sessions_30d: number;
  session_minutes_30d: number;
  ai_questions_30d: number;
  ai_answers_with_source_30d: number;
  ai_avg_confidence: number;
  documents_total: number;
  documents_added_30d: number;
  faqs_total: number;
  knowledge_gaps_open: number;
  approvals_30d: number;
  expiry_alerts_open: number;
  expiry_alerts_resolved_30d: number;
  incidents_open: number;
  incidents_closed_30d: number;
  academy_assigned_30d: number;
  academy_completed_30d: number;
  errors_30d: number;
  last_backup_days_ago: number | null;
}

const EMPTY: UsageMetrics = {
  window_days: 30,
  users_total: 0,
  users_active_7d: 0,
  users_active_30d: 0,
  sessions_30d: 0,
  session_minutes_30d: 0,
  ai_questions_30d: 0,
  ai_answers_with_source_30d: 0,
  ai_avg_confidence: 0,
  documents_total: 0,
  documents_added_30d: 0,
  faqs_total: 0,
  knowledge_gaps_open: 0,
  approvals_30d: 0,
  expiry_alerts_open: 0,
  expiry_alerts_resolved_30d: 0,
  incidents_open: 0,
  incidents_closed_30d: 0,
  academy_assigned_30d: 0,
  academy_completed_30d: 0,
  errors_30d: 0,
  last_backup_days_ago: null,
};

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : 0;
}

/**
 * Run one aggregate query and fold the resulting single row into the metrics.
 * Any failure (missing table, missing column) is swallowed on purpose.
 */
async function block(
  pool: Pool,
  sql: string,
  apply: (row: Record<string, unknown>, out: UsageMetrics) => void,
  out: UsageMetrics,
): Promise<void> {
  try {
    const { rows } = await pool.query<Record<string, unknown>>(sql);
    if (rows[0]) apply(rows[0], out);
  } catch {
    /* table or column not present in this installation */
  }
}

export async function collectUsageMetrics(pool: Pool): Promise<UsageMetrics> {
  const out: UsageMetrics = { ...EMPTY };

  await block(
    pool,
    `SELECT count(*) AS total FROM public.profiles`,
    (r, o) => {
      o.users_total = num(r.total);
    },
    out,
  );

  // Activity and "time in app" are derived from chat turns only: consecutive
  // turns by the same author less than 30 minutes apart count as one session.
  await block(
    pool,
    `WITH turns AS (
       SELECT user_id, created_at,
              created_at - lag(created_at) OVER (PARTITION BY user_id ORDER BY created_at) AS gap
       FROM public.messages
       WHERE role = 'user' AND created_at > now() - interval '30 days'
     )
     SELECT
       (SELECT count(DISTINCT user_id) FROM public.messages
          WHERE role='user' AND created_at > now() - interval '7 days') AS a7,
       (SELECT count(DISTINCT user_id) FROM turns) AS a30,
       count(*) FILTER (WHERE gap IS NULL OR gap > interval '30 minutes') AS sessions,
       COALESCE(sum(LEAST(EXTRACT(EPOCH FROM gap) / 60, 30)), 0) AS minutes
     FROM turns`,
    (r, o) => {
      o.users_active_7d = num(r.a7);
      o.users_active_30d = num(r.a30);
      o.sessions_30d = num(r.sessions);
      o.session_minutes_30d = num(r.minutes);
    },
    out,
  );

  await block(
    pool,
    `SELECT
       count(*) FILTER (WHERE role='user' AND created_at > now() - interval '30 days') AS questions,
       count(*) FILTER (WHERE role='assistant' AND created_at > now() - interval '30 days'
                        AND citations IS NOT NULL AND jsonb_array_length(citations) > 0) AS with_source,
       COALESCE(round(avg(confidence) FILTER (WHERE role='assistant'
                        AND created_at > now() - interval '30 days')::numeric, 2), 0) AS confidence
     FROM public.messages`,
    (r, o) => {
      o.ai_questions_30d = num(r.questions);
      o.ai_answers_with_source_30d = num(r.with_source);
      o.ai_avg_confidence = num(r.confidence);
    },
    out,
  );

  await block(
    pool,
    `SELECT count(*) AS total,
            count(*) FILTER (WHERE created_at > now() - interval '30 days') AS added
     FROM public.knowledge_documents`,
    (r, o) => {
      o.documents_total = num(r.total);
      o.documents_added_30d = num(r.added);
    },
    out,
  );

  await block(
    pool,
    `SELECT count(*) AS total FROM public.faqs`,
    (r, o) => {
      o.faqs_total = num(r.total);
    },
    out,
  );

  await block(
    pool,
    `SELECT count(*) AS open FROM public.knowledge_gaps WHERE status='open'`,
    (r, o) => {
      o.knowledge_gaps_open = num(r.open);
    },
    out,
  );

  await block(
    pool,
    `SELECT count(*) AS approvals FROM public.audit_log
     WHERE created_at > now() - interval '30 days' AND action ILIKE '%approve%'`,
    (r, o) => {
      o.approvals_30d = num(r.approvals);
    },
    out,
  );

  await block(
    pool,
    `SELECT count(*) AS errors FROM public.audit_log
     WHERE created_at > now() - interval '30 days' AND success = false`,
    (r, o) => {
      o.errors_30d = num(r.errors);
    },
    out,
  );

  // Transport expiry pressure — how many deadlines are live, and how many
  // were brought back into compliance in the window.
  await block(
    pool,
    `SELECT
       count(*) FILTER (WHERE expires_on IS NOT NULL
                        AND expires_on <= current_date + 60) AS open,
       count(*) FILTER (WHERE expires_on > current_date
                        AND updated_at > now() - interval '30 days') AS resolved
     FROM public.transport_documents`,
    (r, o) => {
      o.expiry_alerts_open = num(r.open);
      o.expiry_alerts_resolved_30d = num(r.resolved);
    },
    out,
  );

  await block(
    pool,
    `SELECT
       count(*) FILTER (WHERE status NOT IN ('closed','cancelled')) AS open,
       count(*) FILTER (WHERE status = 'closed'
                        AND updated_at > now() - interval '30 days') AS closed
     FROM public.transport_incidents`,
    (r, o) => {
      o.incidents_open = num(r.open);
      o.incidents_closed_30d = num(r.closed);
    },
    out,
  );

  await block(
    pool,
    `SELECT
       count(*) FILTER (WHERE created_at > now() - interval '30 days') AS assigned,
       count(*) FILTER (WHERE status='completed'
                        AND completed_at > now() - interval '30 days') AS completed
     FROM public.academy_enrollments`,
    (r, o) => {
      o.academy_assigned_30d = num(r.assigned);
      o.academy_completed_30d = num(r.completed);
    },
    out,
  );

  await block(
    pool,
    `SELECT EXTRACT(EPOCH FROM (now() - max(created_at))) / 86400 AS days
     FROM public.snapshots`,
    (r, o) => {
      const d = r.days == null ? null : num(r.days);
      o.last_backup_days_ago = d;
    },
    out,
  );

  return out;
}
