import type { Pool } from "pg";
import { computeWorkspaceHealth } from "@/lib/dashboard-health";
import type {
  DashboardActivityRow,
  DashboardCriticalSop,
  DashboardKnowledgeStatus,
  DashboardKpis,
  DashboardTopSop,
  IDashboardRepository,
  JsonLike,
} from "@/lib/providers/interfaces";

/**
 * Self-Hosted dashboard read models, computed directly from the local
 * PostgreSQL schema (no Supabase, no RPC). Shapes mirror the Cloud
 * `dashboard_*` functions exactly so the same UI renders both products.
 *
 * Local notes:
 * - "questions" are user chat turns (`public.messages` role='user'); the local
 *   `audit_log` is a security log without company scoping.
 * - `active users` = distinct authors of messages in the window.
 * - Top SOPs are derived from the citations stored on assistant messages.
 */
export function createPgDashboardRepository({ pool }: { pool: Pool }): IDashboardRepository {
  const one = async <T extends Record<string, unknown>>(
    sql: string,
    params: unknown[],
  ): Promise<T | undefined> => {
    const { rows } = await pool.query<T>(sql, params);
    return rows[0];
  };

  const bucketExpr = (bucket: "hour" | "day" | "week") =>
    bucket === "hour" ? "hour" : bucket === "week" ? "week" : "day";

  return {
    async kpis(companyId) {
      const row = await one<Record<string, string>>(
        `SELECT
           (SELECT count(*) FROM public.messages WHERE company_id=$1 AND role='user') AS questions_answered,
           (SELECT count(*) FROM public.messages WHERE company_id=$1 AND role='user' AND created_at > now() - interval '30 days') AS questions_30d,
           (SELECT count(*) FROM public.messages WHERE company_id=$1 AND role='user' AND created_at::date = current_date) AS questions_today,
           (SELECT COALESCE(round(avg(confidence)::numeric, 2), 0) FROM public.messages
              WHERE company_id=$1 AND role='assistant' AND confidence IS NOT NULL
                AND created_at > now() - interval '30 days') AS avg_confidence,
           (SELECT count(*) FROM public.knowledge_gaps WHERE company_id=$1 AND status='open') AS open_gaps,
           (SELECT count(*) FROM public.knowledge_documents WHERE company_id=$1 AND is_critical AND is_active) AS critical_sops,
           (SELECT count(*) FROM public.knowledge_documents WHERE company_id=$1 AND is_active) AS documents,
           (SELECT count(*) FROM public.faqs WHERE company_id=$1) AS faqs,
           (SELECT count(*) FROM public.ai_audits WHERE company_id=$1) AS ai_audits,
           (SELECT count(*) FROM public.audit_log WHERE at > now() - interval '30 days') AS audit_events,
           (SELECT count(DISTINCT user_id) FROM public.messages
              WHERE company_id=$1 AND created_at > now() - interval '30 days') AS active_users`,
        [companyId],
      );
      const n = (k: string) => Number(row?.[k] ?? 0);
      const kpis: DashboardKpis = {
        questionsAnswered: n("questions_answered"),
        questions30d: n("questions_30d"),
        questionsToday: n("questions_today"),
        avgConfidence: n("avg_confidence"),
        openGaps: n("open_gaps"),
        criticalSops: n("critical_sops"),
        documents: n("documents"),
        faqs: n("faqs"),
        aiAudits: n("ai_audits"),
        auditEvents: n("audit_events"),
        activeUsers: n("active_users"),
      };
      return kpis;
    },

    async health(companyId) {
      const row = await one<Record<string, string>>(
        `SELECT
           (SELECT count(*) FROM public.knowledge_documents WHERE company_id=$1 AND is_active) AS docs,
           (SELECT count(*) FROM public.knowledge_documents WHERE company_id=$1 AND is_critical AND is_active) AS critical,
           (SELECT count(*) FROM public.knowledge_gaps WHERE company_id=$1 AND status='open') AS gaps,
           (SELECT COALESCE(avg(confidence)::numeric, 0.7) FROM public.messages
              WHERE company_id=$1 AND role='assistant' AND confidence IS NOT NULL
                AND created_at > now() - interval '30 days') AS conf,
           (SELECT count(*) FROM public.faqs WHERE company_id=$1) AS faqs,
           (SELECT COALESCE((SELECT score FROM public.ai_audits WHERE company_id=$1
              ORDER BY created_at DESC LIMIT 1), 70)) AS audit_score`,
        [companyId],
      );
      return computeWorkspaceHealth({
        documents: Number(row?.docs ?? 0),
        criticalSops: Number(row?.critical ?? 0),
        openGaps: Number(row?.gaps ?? 0),
        avgConfidence: Number(row?.conf ?? 0.7),
        faqs: Number(row?.faqs ?? 0),
        lastAuditScore: Number(row?.audit_score ?? 70),
      });
    },

    async knowledgeStatus(companyId) {
      const row = await one<Record<string, string>>(
        `SELECT
           (SELECT count(*) FROM public.knowledge_documents
              WHERE company_id=$1 AND is_active AND status='ready' AND chunk_count > 0) AS complete,
           (SELECT count(*) FROM public.knowledge_documents
              WHERE company_id=$1 AND is_active AND status IN ('processing','pending','ingesting')) AS in_progress,
           (SELECT count(*) FROM public.knowledge_gaps WHERE company_id=$1 AND status='open') AS missing`,
        [companyId],
      );
      const status: DashboardKnowledgeStatus = {
        complete: Number(row?.complete ?? 0),
        inProgress: Number(row?.in_progress ?? 0),
        missing: Number(row?.missing ?? 0),
      };
      return status;
    },

    async topSops(companyId, limit) {
      const { rows } = await pool.query<{
        code: string | null;
        title: string | null;
        hits: string;
        updated_at: Date | null;
      }>(
        `WITH usage AS (
           SELECT s->>'code' AS code, s->>'title' AS title, count(*) AS hits
             FROM public.messages m, jsonb_array_elements(COALESCE(m.sources, '[]'::jsonb)) s
            WHERE m.company_id=$1 AND m.created_at > now() - interval '30 days'
              AND s->>'type' = 'document'
            GROUP BY 1, 2 ORDER BY hits DESC LIMIT $2
         )
         SELECT u.code, u.title, u.hits, d.updated_at
           FROM usage u
           LEFT JOIN public.knowledge_documents d
             ON d.company_id=$1 AND d.doc_code = u.code AND d.is_active`,
        [companyId, limit],
      );
      const top: DashboardTopSop[] = rows.map((r) => ({
        code: r.code,
        title: r.title,
        usage: Number(r.hits),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
      }));
      return top;
    },

    async criticalSops(companyId) {
      const { rows } = await pool.query<{
        id: string;
        title: string;
        doc_code: string | null;
        version: number;
        updated_at: Date;
        section: string | null;
        chunk_count: number;
      }>(
        `SELECT id, title, doc_code, version, updated_at, section, chunk_count
           FROM public.knowledge_documents
          WHERE company_id=$1 AND is_active
            AND (is_critical OR updated_at < now() - interval '180 days' OR doc_code IS NULL)
          ORDER BY updated_at ASC LIMIT 8`,
        [companyId],
      );
      const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
      const out: DashboardCriticalSop[] = rows.map((r) => ({
        id: r.id,
        title: r.title,
        code: r.doc_code,
        version: r.version,
        updatedAt: new Date(r.updated_at).toISOString(),
        reason:
          new Date(r.updated_at).getTime() < cutoff
            ? "Outdated"
            : !r.doc_code || !r.section
              ? "Missing metadata"
              : r.chunk_count === 0
                ? "Needs Review"
                : "Critical SOP",
      }));
      return out;
    },

    async lastAiAudit(companyId) {
      const { rows } = await pool.query<{
        id: string;
        score: number;
        maturity: string | null;
        passed: number;
        warnings: number;
        critical: number;
        summary: JsonLike | null;
        created_at: Date;
      }>(
        `SELECT id, score, maturity, passed, warnings, critical, summary, created_at
           FROM public.ai_audits WHERE company_id=$1 ORDER BY created_at DESC LIMIT 1`,
        [companyId],
      );
      const r = rows[0];
      if (!r) return null;
      return {
        id: r.id,
        score: r.score,
        maturity: r.maturity,
        passed: r.passed,
        warnings: r.warnings,
        critical: r.critical,
        summary: (r.summary ?? {}) as JsonLike,
        createdAt: new Date(r.created_at).toISOString(),
      };
    },

    async activity(companyId, from, to, bucket) {
      const unit = bucketExpr(bucket);
      const { rows } = await pool.query<{
        bucket: Date;
        questions: string;
        conversations: string;
        users: string;
        ai_responses: string;
      }>(
        `WITH series AS (
           SELECT generate_series(date_trunc($4, $2::timestamptz), date_trunc($4, $3::timestamptz),
                                  ('1 ' || $4)::interval) AS bucket
         ), questions AS (
           SELECT date_trunc($4, created_at) AS bucket, count(*) AS c, count(DISTINCT user_id) AS u
             FROM public.messages
            WHERE company_id=$1 AND role='user' AND created_at BETWEEN $2::timestamptz AND $3::timestamptz
            GROUP BY 1
         ), convos AS (
           SELECT date_trunc($4, created_at) AS bucket, count(*) AS c
             FROM public.threads
            WHERE company_id=$1 AND created_at BETWEEN $2::timestamptz AND $3::timestamptz
            GROUP BY 1
         ), responses AS (
           SELECT date_trunc($4, created_at) AS bucket, count(*) AS c
             FROM public.messages
            WHERE company_id=$1 AND role='assistant' AND created_at BETWEEN $2::timestamptz AND $3::timestamptz
            GROUP BY 1
         )
         SELECT s.bucket,
                COALESCE(q.c, 0) AS questions,
                COALESCE(c.c, 0) AS conversations,
                COALESCE(q.u, 0) AS users,
                COALESCE(r.c, 0) AS ai_responses
           FROM series s
           LEFT JOIN questions q ON q.bucket = s.bucket
           LEFT JOIN convos c ON c.bucket = s.bucket
           LEFT JOIN responses r ON r.bucket = s.bucket
          ORDER BY s.bucket`,
        [companyId, from, to, unit],
      );
      const out: DashboardActivityRow[] = rows.map((r) => ({
        bucket: new Date(r.bucket).toISOString(),
        questions: Number(r.questions),
        conversations: Number(r.conversations),
        users: Number(r.users),
        aiResponses: Number(r.ai_responses),
      }));
      return out;
    },

    async getLayout(userId) {
      const { rows } = await pool.query<{ dashboard_layout: unknown }>(
        `SELECT dashboard_layout FROM public.users WHERE id=$1`,
        [userId],
      );
      return rows[0]?.dashboard_layout ?? null;
    },

    async saveLayout(userId, layout) {
      await pool.query(`UPDATE public.users SET dashboard_layout=$2::jsonb WHERE id=$1`, [
        userId,
        JSON.stringify(layout ?? null),
      ]);
    },
  };
}
