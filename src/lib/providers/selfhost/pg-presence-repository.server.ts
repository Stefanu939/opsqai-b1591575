// Self-Hosted IPresenceRepository — presence fields on public.users and
// public.time_off_requests (migration 0028_presence_time_off.sql).

import type { Pool } from "pg";
import type {
  IPresenceRepository,
  PresenceRecord,
  PresenceStatus,
  TimeOffRecord,
  TimeOffStatus,
} from "@/lib/providers/interfaces";

export interface PgPresenceRepositoryDeps {
  pool: Pool;
  tenantCompanyId?: string | null;
}

interface PresenceRow {
  id: string;
  presence_status: string | null;
  presence_message: string | null;
  presence_until: string | null;
}

interface TimeOffRow {
  id: string;
  user_id: string;
  company_id: string | null;
  starts_on: string;
  ends_on: string;
  reason: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  calendar_event_id: string | null;
  created_at: string;
}

function mapPresence(row: PresenceRow): PresenceRecord {
  return {
    userId: row.id,
    status: (row.presence_status ?? "available") as PresenceStatus,
    message: row.presence_message,
    until: row.presence_until ? new Date(row.presence_until).toISOString() : null,
  };
}

function mapTimeOff(row: TimeOffRow): TimeOffRecord {
  return {
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id,
    startsOn: String(row.starts_on).slice(0, 10),
    endsOn: String(row.ends_on).slice(0, 10),
    reason: row.reason,
    status: row.status as TimeOffStatus,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at ? new Date(row.approved_at).toISOString() : null,
    calendarEventId: row.calendar_event_id,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

const TIME_OFF_COLS = `id, user_id, company_id, starts_on, ends_on, reason, status,
       approved_by, approved_at, calendar_event_id, created_at`;

export function createPgPresenceRepository(
  deps: PgPresenceRepositoryDeps,
): IPresenceRepository {
  const { pool } = deps;
  const tenant = deps.tenantCompanyId ?? null;

  return {
    async getPresence(userId) {
      const { rows } = await pool.query<PresenceRow>(
        `SELECT id, presence_status, presence_message, presence_until
           FROM public.users WHERE id = $1`,
        [userId],
      );
      return rows[0] ? mapPresence(rows[0]) : null;
    },

    async setPresence(userId, patch) {
      const { rows } = await pool.query<PresenceRow>(
        `UPDATE public.users
            SET presence_status = $2, presence_message = $3, presence_until = $4,
                updated_at = now()
          WHERE id = $1
        RETURNING id, presence_status, presence_message, presence_until`,
        [userId, patch.status, patch.message, patch.until],
      );
      if (!rows[0]) throw new Error("User not found");
      return mapPresence(rows[0]);
    },

    async listPresence(userIds) {
      if (userIds.length === 0) return [];
      const { rows } = await pool.query<PresenceRow>(
        `SELECT id, presence_status, presence_message, presence_until
           FROM public.users WHERE id = ANY($1::uuid[])`,
        [userIds],
      );
      return rows.map(mapPresence);
    },

    async createTimeOff(input) {
      const { rows } = await pool.query<TimeOffRow>(
        `INSERT INTO public.time_off_requests
           (user_id, company_id, starts_on, ends_on, reason, status)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING ${TIME_OFF_COLS}`,
        [
          input.userId,
          input.companyId ?? tenant,
          input.startsOn,
          input.endsOn,
          input.reason,
          input.status,
        ],
      );
      return mapTimeOff(rows[0]!);
    },

    async listMyTimeOff(userId) {
      const { rows } = await pool.query<TimeOffRow>(
        `SELECT ${TIME_OFF_COLS} FROM public.time_off_requests
          WHERE user_id = $1 ORDER BY starts_on DESC LIMIT 50`,
        [userId],
      );
      return rows.map(mapTimeOff);
    },

    async listCompanyTimeOff(companyId) {
      const scope = companyId ?? tenant;
      const { rows } = scope
        ? await pool.query<TimeOffRow>(
            `SELECT ${TIME_OFF_COLS} FROM public.time_off_requests
              WHERE company_id = $1 OR company_id IS NULL
              ORDER BY starts_on DESC LIMIT 100`,
            [scope],
          )
        : await pool.query<TimeOffRow>(
            `SELECT ${TIME_OFF_COLS} FROM public.time_off_requests
              ORDER BY starts_on DESC LIMIT 100`,
          );
      return rows.map(mapTimeOff);
    },

    async getTimeOff(id) {
      const { rows } = await pool.query<TimeOffRow>(
        `SELECT ${TIME_OFF_COLS} FROM public.time_off_requests WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapTimeOff(rows[0]) : null;
    },

    async updateTimeOff(id, patch) {
      const { rows } = await pool.query<TimeOffRow>(
        `UPDATE public.time_off_requests
            SET status = COALESCE($2, status),
                approved_by = CASE WHEN $3::boolean THEN $4::uuid ELSE approved_by END,
                approved_at = CASE WHEN $5::boolean THEN $6::timestamptz ELSE approved_at END,
                calendar_event_id = CASE WHEN $7::boolean THEN $8::uuid ELSE calendar_event_id END,
                updated_at = now()
          WHERE id = $1
        RETURNING ${TIME_OFF_COLS}`,
        [
          id,
          patch.status ?? null,
          patch.approvedBy !== undefined,
          patch.approvedBy ?? null,
          patch.approvedAt !== undefined,
          patch.approvedAt ?? null,
          patch.calendarEventId !== undefined,
          patch.calendarEventId ?? null,
        ],
      );
      if (!rows[0]) throw new Error("Time off request not found");
      return mapTimeOff(rows[0]);
    },
  };
}
