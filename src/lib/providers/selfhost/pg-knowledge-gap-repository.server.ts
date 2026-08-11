// Self-Hosted IKnowledgeGapRepository — exact-text dedup on
// `question_normalized`. No pgvector on Self-Hosted v1; the `embedding`
// column exists as bytea for a future upgrade path.

import type { Pool } from "pg";
import type {
  IKnowledgeGapRepository,
  KnowledgeGapListRow,
} from "@/lib/providers/interfaces";

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

    async list(companyId, limit) {
      const { rows } = await pool.query<KnowledgeGapListRow & {
        first_seen: Date;
        last_seen: Date;
        updated_at: Date;
        resolution_date: Date | null;
        doc_title: string | null;
        doc_code: string | null;
        faq_question: string | null;
      }>(
        `SELECT g.id, g.question_sample, g.question_normalized, g.occurrences,
                g.first_seen, g.last_seen, g.status, g.assignee_id, g.resolution,
                g.resolved_document_id, g.resolved_faq_id, g.department_id,
                g.created_by, g.confidence, g.source_thread_id, g.source_message_id,
                g.resolution_date, g.updated_at,
                d.name AS department_name,
                u.full_name AS created_by_name,
                kd.title AS doc_title, kd.doc_code AS doc_code,
                f.question_en AS faq_question
           FROM public.knowledge_gaps g
           LEFT JOIN public.departments d ON d.id = g.department_id
           LEFT JOIN public.users u ON u.id = g.created_by
           LEFT JOIN public.knowledge_documents kd ON kd.id = g.resolved_document_id
           LEFT JOIN public.faqs f ON f.id = g.resolved_faq_id
          WHERE g.company_id = $1
          ORDER BY g.last_seen DESC
          LIMIT $2`,
        [companyId, limit],
      );
      return rows.map((r) => ({
        ...r,
        first_seen: new Date(r.first_seen).toISOString(),
        last_seen: new Date(r.last_seen).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
        resolution_date: r.resolution_date ? new Date(r.resolution_date).toISOString() : null,
        resolved_document: r.resolved_document_id
          ? { id: r.resolved_document_id, title: r.doc_title ?? "Document", doc_code: r.doc_code }
          : null,
        resolved_faq: r.resolved_faq_id
          ? { id: r.resolved_faq_id, question_en: r.faq_question }
          : null,
      })) as KnowledgeGapListRow[];
    },

    async update(companyId, id, patch) {
      const cols: string[] = [];
      const values: unknown[] = [companyId, id];
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue;
        values.push(value);
        cols.push(`${key} = $${values.length}`);
      }
      if (!cols.length) return;
      await pool.query(
        `UPDATE public.knowledge_gaps SET ${cols.join(", ")}, updated_at = NOW()
          WHERE company_id = $1 AND id = $2`,
        values,
      );
    },

    async remove(companyId, id) {
      await pool.query(`DELETE FROM public.knowledge_gaps WHERE company_id = $1 AND id = $2`, [
        companyId,
        id,
      ]);
    },
  };
}
