// Self-Hosted IFeedbackRepository — backed by public.message_feedback.

import type { Pool } from "pg";
import type { IFeedbackRepository } from "@/lib/providers/interfaces";

export interface PgFeedbackRepositoryDeps {
  pool: Pool;
}

export function createPgFeedbackRepository(deps: PgFeedbackRepositoryDeps): IFeedbackRepository {
  const { pool } = deps;
  return {
    async upsertRating({ messageId, userId, companyId, rating, comment }) {
      await pool.query(
        `INSERT INTO public.message_feedback
           (message_id, user_id, company_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (message_id, user_id)
         DO UPDATE SET rating = EXCLUDED.rating,
                       comment = EXCLUDED.comment,
                       updated_at = NOW()`,
        [messageId, userId, companyId, rating, comment],
      );
    },
  };
}
