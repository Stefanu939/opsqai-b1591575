// Self-Hosted IMessageRepository — narrow reads on public.messages.

import type { Pool } from "pg";
import type { IMessageRepository } from "@/lib/providers/interfaces";

export interface PgMessageRepositoryDeps {
  pool: Pool;
}

export function createPgMessageRepository(deps: PgMessageRepositoryDeps): IMessageRepository {
  const { pool } = deps;
  return {
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
        createdAt: r.created_at.toISOString(),
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
  };
}
