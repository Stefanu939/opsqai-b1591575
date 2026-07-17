// Cloud IProfileRepository — thin wrapper over Supabase `profiles`.
//
// Two flavours share one implementation:
//  - user-scoped: constructed from a request-scoped SupabaseClient
//    (provided by `requireAuth`'s data context). RLS applies.
//  - admin:       constructed with the service-role admin client, used
//    only by admin flows (invite user, delete user).
//
// Only feature-neutral CRUD; feature-specific joins stay in the
// consumer server functions for now.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import type {
  IProfileRepository,
  ProfileCreateInput,
  ProfilePatch,
  ProfileRecord,
} from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

interface ProfilesRow {
  id: string;
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  department_id: string | null;
  is_active: boolean;
  language_pref: string;
  dashboard_layout: unknown;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ProfilesRow, email: string | null = null): ProfileRecord {
  return {
    userId: row.id,
    companyId: row.company_id,
    email,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    position: row.position,
    department: row.department,
    departmentId: row.department_id,
    isActive: row.is_active,
    languagePref: row.language_pref,
    dashboardLayout: row.dashboard_layout ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPatch(patch: ProfilePatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.companyId !== undefined) out.company_id = patch.companyId;
  if (patch.firstName !== undefined) out.first_name = patch.firstName;
  if (patch.lastName !== undefined) out.last_name = patch.lastName;
  if (patch.fullName !== undefined) out.full_name = patch.fullName;
  if (patch.avatarUrl !== undefined) out.avatar_url = patch.avatarUrl;
  if (patch.phone !== undefined) out.phone = patch.phone;
  if (patch.position !== undefined) out.position = patch.position;
  if (patch.department !== undefined) out.department = patch.department;
  if (patch.departmentId !== undefined) out.department_id = patch.departmentId;
  if (patch.isActive !== undefined) out.is_active = patch.isActive;
  if (patch.languagePref !== undefined) out.language_pref = patch.languagePref;
  if (patch.dashboardLayout !== undefined) out.dashboard_layout = patch.dashboardLayout;
  return out;
}

const COLS =
  "id, company_id, first_name, last_name, full_name, avatar_url, phone, position, department, department_id, is_active, language_pref, dashboard_layout, created_at, updated_at";

export function createSupabaseProfileRepository(client: Client): IProfileRepository {
  return {
    async findByUserId(userId) {
      const { data, error } = await client
        .from("profiles")
        .select(COLS)
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRow(data as ProfilesRow) : null;
    },

    async updateByUserId(userId, patch) {
      const { data, error } = await client
        .from("profiles")
        .update(mapPatch(patch) as never)
        .eq("id", userId)
        .select(COLS)
        .single();
      if (error) throw error;
      return mapRow(data as ProfilesRow);
    },


    async listByCompany(companyId) {
      const { data, error } = await client
        .from("profiles")
        .select(COLS)
        .eq("company_id", companyId);
      if (error) throw error;
      return (data ?? []).map((r) => mapRow(r as ProfilesRow));
    },

    async create(input: ProfileCreateInput) {
      const row = {
        id: input.userId,
        company_id: input.companyId,
        first_name: input.firstName ?? null,
        last_name: input.lastName ?? null,
        full_name: input.fullName ?? null,
        avatar_url: input.avatarUrl ?? null,
        phone: input.phone ?? null,
        position: input.position ?? null,
        department: input.department ?? null,
        department_id: input.departmentId ?? null,
        is_active: input.isActive ?? true,
        language_pref: input.languagePref ?? "en",
        dashboard_layout: input.dashboardLayout ?? null,
      };
      const { data, error } = await client
        .from("profiles")
        .insert(row)
        .select(COLS)
        .single();
      if (error) throw error;
      return mapRow(data as ProfilesRow);
    },

    async deleteByUserId(userId) {
      const { error } = await client.from("profiles").delete().eq("id", userId);
      if (error) throw error;
    },
  };
}
