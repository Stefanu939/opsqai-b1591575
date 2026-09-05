// Cloud IPresenceRepository — presence fields on `profiles` plus the
// `time_off_requests` table. All access goes through the request-scoped
// Supabase client, so RLS applies as the signed-in user.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IPresenceRepository,
  PresenceRecord,
  PresenceStatus,
  TimeOffRecord,
  TimeOffStatus,
} from "@/lib/providers/interfaces";

type Client = SupabaseClient<never>;
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyClient = any;

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
    until: row.presence_until,
  };
}

function mapTimeOff(row: TimeOffRow): TimeOffRecord {
  return {
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    reason: row.reason,
    status: row.status as TimeOffStatus,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    calendarEventId: row.calendar_event_id,
    createdAt: row.created_at,
  };
}

const PRESENCE_COLS = "id, presence_status, presence_message, presence_until";
const TIME_OFF_COLS =
  "id, user_id, company_id, starts_on, ends_on, reason, status, approved_by, approved_at, calendar_event_id, created_at";

export function createSupabasePresenceRepository(client: Client): IPresenceRepository {
  const db = client as AnyClient;
  return {
    async getPresence(userId) {
      const { data, error } = await db
        .from("profiles")
        .select(PRESENCE_COLS)
        .eq("id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapPresence(data as PresenceRow) : null;
    },

    async setPresence(userId, patch) {
      const { data, error } = await db
        .from("profiles")
        .update({
          presence_status: patch.status,
          presence_message: patch.message,
          presence_until: patch.until,
        })
        .eq("id", userId)
        .select(PRESENCE_COLS)
        .single();
      if (error) throw new Error(error.message);
      return mapPresence(data as PresenceRow);
    },

    async listPresence(userIds) {
      if (userIds.length === 0) return [];
      const { data, error } = await db
        .from("profiles")
        .select(PRESENCE_COLS)
        .in("id", userIds);
      if (error) throw new Error(error.message);
      return ((data ?? []) as PresenceRow[]).map(mapPresence);
    },

    async createTimeOff(input) {
      const { data, error } = await db
        .from("time_off_requests")
        .insert({
          user_id: input.userId,
          company_id: input.companyId,
          starts_on: input.startsOn,
          ends_on: input.endsOn,
          reason: input.reason,
          status: input.status,
        })
        .select(TIME_OFF_COLS)
        .single();
      if (error) throw new Error(error.message);
      return mapTimeOff(data as TimeOffRow);
    },

    async listMyTimeOff(userId) {
      const { data, error } = await db
        .from("time_off_requests")
        .select(TIME_OFF_COLS)
        .eq("user_id", userId)
        .order("starts_on", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return ((data ?? []) as TimeOffRow[]).map(mapTimeOff);
    },

    async listCompanyTimeOff(companyId) {
      if (!companyId) return [];
      const { data, error } = await db
        .from("time_off_requests")
        .select(TIME_OFF_COLS)
        .eq("company_id", companyId)
        .order("starts_on", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return ((data ?? []) as TimeOffRow[]).map(mapTimeOff);
    },

    async getTimeOff(id) {
      const { data, error } = await db
        .from("time_off_requests")
        .select(TIME_OFF_COLS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapTimeOff(data as TimeOffRow) : null;
    },

    async updateTimeOff(id, patch) {
      const update: Record<string, unknown> = {};
      if (patch.status !== undefined) update["status"] = patch.status;
      if (patch.approvedBy !== undefined) update["approved_by"] = patch.approvedBy;
      if (patch.approvedAt !== undefined) update["approved_at"] = patch.approvedAt;
      if (patch.calendarEventId !== undefined)
        update["calendar_event_id"] = patch.calendarEventId;
      const { data, error } = await db
        .from("time_off_requests")
        .update(update)
        .eq("id", id)
        .select(TIME_OFF_COLS)
        .single();
      if (error) throw new Error(error.message);
      return mapTimeOff(data as TimeOffRow);
    },
  };
}
