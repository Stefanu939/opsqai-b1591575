// Self-Hosted IFaqRepository — backed by public.faqs.

import type { Pool } from "pg";
import type { FaqRow, FaqUpsertInput, IFaqRepository } from "@/lib/providers/interfaces";

export interface PgFaqRepositoryDeps {
  pool: Pool;
}

export function createPgFaqRepository(deps: PgFaqRepositoryDeps): IFaqRepository {
  const { pool } = deps;
  return {
    async update(id, patch) {
      await pool.query(
        `UPDATE public.faqs
            SET question_de = $2,
                question_en = $3,
                answer_de   = $4,
                answer_en   = $5,
                category    = $6
          WHERE id = $1`,
        [id, patch.question_de, patch.question_en, patch.answer_de, patch.answer_en, patch.category],
      );
    },

    async getMetaById(id) {
      const { rows } = await pool.query<
        Pick<FaqRow, "company_id" | "category" | "question_en">
      >(
        `SELECT company_id, category, question_en FROM public.faqs WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    async insert(companyId, input) {
      const { rows } = await pool.query<Pick<FaqRow, "id" | "category" | "question_en">>(
        `INSERT INTO public.faqs
           (company_id, question_de, question_en, answer_de, answer_en, category)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, category, question_en`,
        [
          companyId,
          input.question_de,
          input.question_en,
          input.answer_de,
          input.answer_en,
          input.category,
        ],
      );
      return rows[0];
    },

    async delete(id) {
      await pool.query(`DELETE FROM public.faqs WHERE id = $1`, [id]);
    },
  };
}

export const pgFaqRepositoryFactory =
  (deps: PgFaqRepositoryDeps) => (_dataCtx: unknown) => createPgFaqRepository(deps);
