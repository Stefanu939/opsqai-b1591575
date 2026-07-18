// Self-Hosted IThreadRepository — backed by public.threads (0008).

import type { Pool } from "pg";
import type { IThreadRepository } from "@/lib/providers/interfaces";

export interface PgThreadRepositoryDeps {
  pool: Pool;
}

export function createPgThreadRepository(deps: PgThreadRepositoryDeps): IThreadRepository {
  const { pool } = deps;
  return {
    async create({ userId, companyId, title }) {
      const { rows } = await pool.query<{
        id: string;
        title: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO public.threads (user_id, company_id, title)
         VALUES ($1, $2, $3)
         RETURNING id, title, created_at, updated_at`,
        [userId, companyId, title],
      );
      const r = rows[0];
      return {
        id: r.id,
        title: r.title,
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString(),
      };
    },
    async deleteOwned(id, userId) {
      await pool.query("DELETE FROM public.threads WHERE id = $1 AND user_id = $2", [
        id,
        userId,
      ]);
    },
    async listForUser(userId, opts) {
      const limit = Math.min(opts?.limit ?? 200, 500);
      const { rows } = await pool.query<{
        id: string;
        title: string;
        created_at: Date;
        updated_at: Date;
        company_id: string;
      }>(
        `SELECT id, title, created_at, updated_at, company_id
           FROM public.threads
          WHERE user_id = $1
          ORDER BY updated_at DESC
          LIMIT $2`,
        [userId, limit],
      );
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString(),
        companyId: r.company_id,
      }));
    },
    async renameOwned(id, userId, title) {
      await pool.query(
        `UPDATE public.threads SET title = $3, updated_at = NOW()
          WHERE id = $1 AND user_id = $2`,
        [id, userId, title],
      );
    },
  };
}
