// Self-Hosted IKnowledgeGapRepository — exact-text dedup on
// `question_normalized`. No pgvector on Self-Hosted v1; the `embedding`
// column exists as bytea for a future upgrade path.

import type { Pool } from "pg";
import type { IKnowledgeGapRepository } from "@/lib/providers/interfaces";

export interface PgKnowledgeGapRepositoryDeps {
  pool: Pool;
}

export function createPgKnowledgeGapRepository(
  deps: PgKnowledgeGapRepositoryDeps,
): IKnowledgeGapRepository {
  const { pool } = deps;
  return {
    async matchExisting(companyId, questionNormalized) {
      const { rows } = await pool.query<{ id: string }>(
        `SELECT id FROM public.knowledge_gaps
          WHERE company_id = $1 AND question_normalized = $2
          ORDER BY last_seen DESC LIMIT 1`,
        [companyId, questionNormalized],
      );
      return rows[0]?.id ?? null;
    },
    async incrementOccurrence(id) {
      await pool.query(
        `UPDATE public.knowledge_gaps
            SET occurrences = occurrences + 1,
                last_seen = NOW(),
                status = 'open',
                updated_at = NOW()
          WHERE id = $1 AND status IN ('open', 'in_progress')`,
        [id],
      );
    },
    async create(input) {
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO public.knowledge_gaps
           (company_id, department_id, created_by, confidence,
            question_normalized, question_sample,
            source_thread_id, source_message_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open')
         RETURNING id`,
        [
          input.companyId,
          input.departmentId,
          input.createdBy,
          input.confidence,
          input.questionNormalized,
          input.questionSample,
          input.sourceThreadId,
          input.sourceMessageId,
        ],
      );
      return { id: rows[0].id };
    },
  };
}
