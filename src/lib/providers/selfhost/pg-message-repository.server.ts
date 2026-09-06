// Self-Hosted IMessageRepository — narrow reads on public.messages.

import type { Pool } from "pg";
import type { IMessageRepository, ThreadMessageRecord } from "@/lib/providers/interfaces";
import { toIso } from "./dates";

export interface PgMessageRepositoryDeps {
  pool: Pool;
}

export function createPgMessageRepository(deps: PgMessageRepositoryDeps): IMessageRepository {
  const { pool } = deps;
  return {
    async listByThread(threadId) {
      const { rows } = await pool.query<ThreadMessageRecord>(
        `SELECT id, role, content, parts, sources, created_at
           FROM public.messages
          WHERE thread_id = $1
          ORDER BY created_at`,
        [threadId],
      );
      return rows;
    },

    async findAssistantById(id) {
      const { rows } = await pool.query<{
        id: string;
        thread_id: string;
        confidence: number | null;
        created_at: Date;
      }>(
        `SELECT id, thread_id, confidence, created_at
           FROM public.messages
          WHERE id = $1`,
        [id],
      );
      const r = rows[0];
      if (!r) return null;
      return {
        id: r.id,
        threadId: r.thread_id,
        confidence: r.confidence,
        createdAt: toIso(r.created_at),
      };
    },
    async findLastUserBefore(threadId, beforeCreatedAt) {
      const { rows } = await pool.query<{ id: string; content: string }>(
        `SELECT id, content FROM public.messages
          WHERE thread_id = $1 AND role = 'user' AND created_at < $2
          ORDER BY created_at DESC LIMIT 1`,
        [threadId, beforeCreatedAt],
      );
      return rows[0] ? { id: rows[0].id, content: rows[0].content } : null;
    },
    async insertMany(input) {
      if (input.length === 0) return [];
      const inserted: Array<{ id: string; role: string }> = [];
      for (const message of input) {
        const { rows } = await pool.query<{ id: string; role: string }>(
          `INSERT INTO public.messages
             (thread_id, user_id, company_id, role, content, parts, sources, confidence)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)
           RETURNING id, role`,
          [
            message.threadId,
            message.userId,
            message.companyId,
            message.role,
            message.content,
            JSON.stringify(message.parts),
            message.sources == null ? null : JSON.stringify(message.sources),
            message.confidence,
          ],
        );
        if (rows[0]) inserted.push(rows[0]);
      }
      return inserted;
    },
  };
}
