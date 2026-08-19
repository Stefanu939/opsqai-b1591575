// Self-Hosted ICalendarRepository — backed by public.calendar_events and
// public.calendar_feed_tokens (migration 0026_calendar.sql).

import type { Pool } from "pg";
import type {
  ICalendarRepository,
  LocalCalendarEventInput,
  LocalCalendarEventRow,
} from "@/lib/providers/interfaces";

export interface PgCalendarRepositoryDeps {
  pool: Pool;
  tenantCompanyId?: string | null;
}

export function createPgCalendarRepository(deps: PgCalendarRepositoryDeps): ICalendarRepository {
  const { pool } = deps;
  const companyId = deps.tenantCompanyId ?? null;

  return {
    async listEvents(ownerUserId, from, to) {
      const { rows } = await pool.query<LocalCalendarEventRow>(
        `SELECT id, title, description, kind, location,
                starts_at, ends_at, all_day
           FROM public.calendar_events
          WHERE owner_user_id = $1
            AND starts_at BETWEEN $2 AND $3
          ORDER BY starts_at`,
        [ownerUserId, from, to],
      );
      return rows;
    },

    async upsertEvent(input: LocalCalendarEventInput) {
      if (input.id) {
        const { rows } = await pool.query<{ id: string }>(
          `UPDATE public.calendar_events
              SET title = $3, description = $4, kind = $5, location = $6,
                  starts_at = $7, ends_at = $8, all_day = $9, updated_at = now()
            WHERE id = $1 AND owner_user_id = $2
            RETURNING id`,
          [
            input.id,
            input.ownerUserId,
            input.title,
            input.description,
            input.kind,
            input.location,
            input.starts_at,
            input.ends_at,
            input.all_day,
          ],
        );
        if (rows[0]) return { id: rows[0].id };
      }
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO public.calendar_events
           (company_id, owner_user_id, title, description, kind, location,
            starts_at, ends_at, all_day)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [
          companyId,
          input.ownerUserId,
          input.title,
          input.description,
          input.kind,
          input.location,
          input.starts_at,
          input.ends_at,
          input.all_day,
        ],
      );
      return { id: rows[0]!.id };
    },

    async deleteEvent(ownerUserId, id) {
      await pool.query(
        `DELETE FROM public.calendar_events WHERE id = $1 AND owner_user_id = $2`,
        [id, ownerUserId],
      );
    },

    async getActiveToken(userId) {
      const { rows } = await pool.query<{ token: string }>(
        `SELECT token FROM public.calendar_feed_tokens
          WHERE user_id = $1 AND revoked_at IS NULL
          ORDER BY created_at DESC LIMIT 1`,
        [userId],
      );
      return rows[0]?.token ?? null;
    },

    async createToken(userId, token) {
      await pool.query(
        `INSERT INTO public.calendar_feed_tokens (token, user_id) VALUES ($1, $2)`,
        [token, userId],
      );
    },

    async revokeTokens(userId) {
      await pool.query(
        `UPDATE public.calendar_feed_tokens
            SET revoked_at = now()
          WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId],
      );
    },

    async resolveToken(token) {
      const { rows } = await pool.query<{ id: string; user_id: string }>(
        `SELECT id, user_id FROM public.calendar_feed_tokens
          WHERE token = $1 AND revoked_at IS NULL LIMIT 1`,
        [token],
      );
      const row = rows[0];
      return row ? { id: row.id, userId: row.user_id } : null;
    },

    async touchToken(id) {
      await pool.query(
        `UPDATE public.calendar_feed_tokens SET last_accessed_at = now() WHERE id = $1`,
        [id],
      );
    },
  };
}
