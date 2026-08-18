// Cloud IModuleAccessRepository — backed by public.user_module_access via
// the user-scoped Supabase client so RLS still applies (same-company
// superadmin/workspace_owner/admin can manage; users can read their own row).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  IModuleAccessRepository,
  ModuleAccessRecord,
} from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

interface Row {
  id: string;
  user_id: string;
  company_id: string;
  module_key: string;
  granted_by: string | null;
  created_at: string;
}

function toRecord(r: Row): ModuleAccessRecord {
  return {
    userId: r.user_id,
    companyId: r.company_id,
    moduleKey: r.module_key,
    grantedBy: r.granted_by,
    createdAt: r.created_at,
  };
}

export function createSupabaseModuleAccessRepository(client: Client): IModuleAccessRepository {
  return {
    async listForUser(companyId, userId) {
      const { data, error } = await client
        .from("user_module_access" as never)
        .select("*")
        .eq("company_id", companyId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as Row[]).map(toRecord);
    },

    async listForCompany(companyId) {
      const { data, error } = await client
        .from("user_module_access" as never)
        .select("*")
        .eq("company_id", companyId);
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as Row[]).map(toRecord);
    },

    async replaceForUser(companyId, userId, moduleKeys, grantedBy) {
      const { error: delErr } = await client
        .from("user_module_access" as never)
        .delete()
        .eq("company_id", companyId)
        .eq("user_id", userId);
      if (delErr) throw new Error(delErr.message);
      if (moduleKeys.length === 0) return;
      const rows = moduleKeys.map((moduleKey) => ({
        company_id: companyId,
        user_id: userId,
        module_key: moduleKey,
        granted_by: grantedBy,
      }));
      const { error: insErr } = await client.from("user_module_access" as never).insert(rows as never);
      if (insErr) throw new Error(insErr.message);
    },
  };
}

export const supabaseModuleAccessRepositoryFactory =
  (dataCtx: unknown): IModuleAccessRepository =>
    createSupabaseModuleAccessRepository(dataCtx as Client);
