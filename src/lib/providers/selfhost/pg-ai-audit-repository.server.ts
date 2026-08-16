import type { Pool } from "pg";
import type {
  AuditGapClusterRow,
  AuditKnowledgeSignalRow,
  AuditLearnerSignalRow,
  IAiAuditRepository,
  JsonLike,
} from "@/lib/providers/interfaces";

const LOW_CONFIDENCE = 0.55;

export function createPgAiAuditRepository({ pool }: { pool: Pool }): IAiAuditRepository {
  return {
    async list(companyId, limit) {
      const { rows } = await pool.query<{
        id: string; score: number; maturity: string | null; passed: number; warnings: number;
        critical: number; summary: JsonLike; created_at: Date;
      }>(`SELECT id, score, maturity, passed, warnings, critical, summary, created_at
            FROM public.ai_audits WHERE company_id=$1 ORDER BY created_at DESC LIMIT $2`,
        [companyId, limit]);
      return rows.map((r) => ({ ...r, createdAt: r.created_at.toISOString() }));
    },
    async create(input) {
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO public.ai_audits
           (company_id, requested_by, score, maturity, summary, passed, warnings, critical,
            model, latency_ms, input_hash, output_hash, token_usage, retrieval_chunk_ids, status, error_code)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16) RETURNING id`,
        [input.companyId,input.requestedBy,input.score,input.maturity,JSON.stringify(input.summary),
         input.passed,input.warnings,input.critical,input.model ?? null,input.latencyMs ?? null,
         input.inputHash ?? null,input.outputHash ?? null,
         input.tokenUsage == null ? null : JSON.stringify(input.tokenUsage),input.retrievalChunkIds ?? [],
         input.status ?? "completed",input.errorCode ?? null],
      );
      return rows[0];
    },

    async gapClusters(companyId, limit): Promise<AuditGapClusterRow[]> {
      const { rows } = await pool.query<{
        id: string; question: string; occurrences: number; status: string;
        department_name: string | null; last_seen: Date; confidence: number | null;
      }>(
        `SELECT g.id, g.question_sample AS question, g.occurrences, g.status,
                d.name AS department_name, g.last_seen, g.confidence
           FROM public.knowledge_gaps g
           LEFT JOIN public.departments d ON d.id = g.department_id
          WHERE g.company_id = $1
          ORDER BY g.occurrences DESC, g.last_seen DESC
          LIMIT $2`,
        [companyId, limit],
      );
      return rows.map((r) => ({
        id: r.id,
        question: r.question,
        occurrences: Number(r.occurrences ?? 0),
        status: r.status,
        departmentName: r.department_name,
        lastSeen: r.last_seen.toISOString(),
        confidence: r.confidence == null ? null : Number(r.confidence),
      }));
    },

    async learnerSignals(companyId, limit): Promise<AuditLearnerSignalRow[]> {
      const { rows } = await pool.query<Record<string, string | null>>(
        `WITH u AS (
           SELECT id, COALESCE(NULLIF(full_name,''),
                               NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)),''),
                               email) AS name,
                  department
             FROM public.users
            WHERE company_id = $1 AND is_active
         ),
         learning AS (
           SELECT p.user_id, COALESCE(SUM(p.time_spent_seconds),0) AS seconds
             FROM public.academy_lesson_progress p
            WHERE p.company_id = $1
            GROUP BY p.user_id
         ),
         enrol AS (
           SELECT e.user_id,
                  COUNT(*) FILTER (WHERE e.status IN ('assigned','in_progress')) AS active,
                  COUNT(*) FILTER (WHERE e.status <> 'completed'
                                     AND e.due_at IS NOT NULL AND e.due_at < now()) AS overdue,
                  COUNT(*) FILTER (WHERE e.status = 'completed') AS completed
             FROM public.academy_enrollments e
            WHERE e.company_id = $1
            GROUP BY e.user_id
         ),
         asked AS (
           SELECT m.user_id, COUNT(*) AS n
             FROM public.messages m
            WHERE m.company_id = $1 AND m.role = 'user'
              AND EXISTS (
                SELECT 1 FROM public.academy_enrollments e
                 WHERE e.user_id = m.user_id
                   AND e.started_at IS NOT NULL
                   AND m.created_at >= e.started_at
                   AND (e.completed_at IS NULL OR m.created_at <= e.completed_at)
              )
            GROUP BY m.user_id
         ),
         answers AS (
           SELECT t.user_id,
                  AVG(m.confidence)::numeric AS avg_conf,
                  COUNT(*) FILTER (WHERE m.confidence IS NOT NULL
                                     AND m.confidence < ${LOW_CONFIDENCE}) AS low_conf
             FROM public.messages m
             JOIN public.threads t ON t.id = m.thread_id
            WHERE m.company_id = $1 AND m.role = 'assistant'
              AND m.created_at > now() - interval '90 days'
            GROUP BY t.user_id
         ),
         quiz AS (
           SELECT q.user_id, AVG(q.score)::numeric AS avg_score,
                  COUNT(*) FILTER (WHERE NOT q.passed) AS failed
             FROM public.academy_quiz_attempts q
            WHERE q.company_id = $1
            GROUP BY q.user_id
         )
         SELECT u.id, u.name, u.department,
                COALESCE(asked.n,0) AS questions_while_learning,
                COALESCE(learning.seconds,0) AS learning_seconds,
                COALESCE(answers.low_conf,0) AS low_confidence,
                COALESCE(answers.avg_conf,0) AS avg_confidence,
                COALESCE(enrol.active,0) AS active_enrollments,
                COALESCE(enrol.overdue,0) AS overdue_enrollments,
                COALESCE(enrol.completed,0) AS completed_enrollments,
                quiz.avg_score, COALESCE(quiz.failed,0) AS failed_attempts
           FROM u
           LEFT JOIN learning ON learning.user_id = u.id
           LEFT JOIN enrol ON enrol.user_id = u.id
           LEFT JOIN asked ON asked.user_id = u.id
           LEFT JOIN answers ON answers.user_id = u.id
           LEFT JOIN quiz ON quiz.user_id = u.id
          WHERE COALESCE(asked.n,0) > 0 OR COALESCE(enrol.active,0) > 0
             OR COALESCE(enrol.overdue,0) > 0 OR quiz.avg_score IS NOT NULL
          ORDER BY COALESCE(asked.n,0) DESC
          LIMIT $2`,
        [companyId, limit],
      );
      const n = (v: string | null) => Number(v ?? 0);
      return rows.map((r) => ({
        userId: String(r["id"]),
        name: String(r["name"] ?? "Unknown"),
        department: r["department"] ?? null,
        questionsWhileLearning: n(r["questions_while_learning"]),
        learningSeconds: n(r["learning_seconds"]),
        lowConfidenceQuestions: n(r["low_confidence"]),
        avgConfidence: n(r["avg_confidence"]),
        activeEnrollments: n(r["active_enrollments"]),
        overdueEnrollments: n(r["overdue_enrollments"]),
        completedEnrollments: n(r["completed_enrollments"]),
        avgQuizScore: r["avg_score"] == null ? null : Math.round(Number(r["avg_score"])),
        failedQuizAttempts: n(r["failed_attempts"]),
      }));
    },

    async knowledgeSignal(companyId): Promise<AuditKnowledgeSignalRow> {
      const [totals, cats] = await Promise.all([
        pool.query<Record<string, string>>(
          `SELECT
             (SELECT count(*) FROM public.knowledge_documents WHERE company_id=$1 AND is_active) AS documents,
             (SELECT count(*) FROM public.knowledge_documents WHERE company_id=$1 AND is_active AND status='ready') AS ready,
             (SELECT count(*) FROM public.knowledge_documents WHERE company_id=$1 AND is_active AND status<>'ready') AS stale,
             (SELECT count(*) FROM public.faqs WHERE company_id=$1) AS faqs,
             (SELECT count(*) FROM public.academy_learning_paths WHERE company_id=$1) AS courses`,
          [companyId],
        ),
        pool.query<{ category: string; n: string }>(
          `SELECT category, count(*)::text AS n FROM public.knowledge_documents
            WHERE company_id=$1 AND is_active GROUP BY category`,
          [companyId],
        ),
      ]);
      const t = totals.rows[0] ?? {};
      const categories: Record<string, number> = {};
      for (const r of cats.rows) categories[r.category] = Number(r.n);
      return {
        documents: Number(t["documents"] ?? 0),
        readyDocuments: Number(t["ready"] ?? 0),
        staleDocuments: Number(t["stale"] ?? 0),
        faqs: Number(t["faqs"] ?? 0),
        courses: Number(t["courses"] ?? 0),
        categories,
      };
    },
  };
}
