// Cloud IRoleRepository — thin wrapper over Supabase `user_roles` +
// `role_permissions`. See supabase-profile-repository.server.ts for the
// two-flavour pattern (user-scoped vs admin).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import type {
  IRoleRepository,
  RoleAssignment,
  RoleAssignmentDetailed,
} from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

const PLATFORM_ROLE_NAMES = new Set(["platform_admin", "platform_owner"]);

export function createSupabaseRoleRepository(client: Client): IRoleRepository {
  return {
    async listRolesForUser(userId) {
      const { data, error } = await client
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r) => String((r as { role: string }).role));
    },

    async hasRole(userId, role) {
      const { data, error } = await client
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", role as never)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },

    async addRole(userId, role, companyId) {
      const payload: Record<string, unknown> = {
        user_id: userId,
        role: role as never,
      };
      if (companyId) payload.company_id = companyId;
      const { error } = await client.from("user_roles").insert(payload as never);
      if (error && !/duplicate key/i.test(error.message)) throw error;
    },

    async removeRole(userId, role) {
      const { error } = await client
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role as never);
      if (error) throw error;
    },

    async removeAllRoles(userId) {
      const { error } = await client.from("user_roles").delete().eq("user_id", userId);
      if (error) throw error;
    },

    async removeNonPlatformRoles(userId) {
      // PostgREST doesn't accept a raw "NOT IN (a,b)" filter cleanly on
      // an enum column, so filter explicitly.
      const { error } = await client
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .not("role", "in", "(platform_admin,platform_owner)");
      if (error) throw error;
    },

    async isPlatformOwner(userId) {
      const { data, error } = await client
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("is_platform_owner", true)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },

    async hasPermission(userId, permission) {
      const { data, error } = await client.rpc("has_permission", {
        _user_id: userId,
        _permission: permission,
      });
      if (error) throw new Error(error.message);
      return data === true;
    },

    async listAssignments(userIds): Promise<RoleAssignment[]> {
      let q = client.from("user_roles").select("user_id, role");
      if (userIds && userIds.length > 0) q = q.in("user_id", userIds);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => ({
        userId: (r as { user_id: string }).user_id,
        role: String((r as { role: string }).role),
      }));
    },

    async listAssignmentsDetailed(userIds): Promise<RoleAssignmentDetailed[]> {
      let q = client
        .from("user_roles")
        .select("user_id, role, is_platform_owner, company_id");
      if (userIds && userIds.length > 0) q = q.in("user_id", userIds);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => {
        const row = r as {
          user_id: string;
          role: string;
          is_platform_owner: boolean | null;
          company_id: string | null;
        };
        const roleName = String(row.role);
        return {
          userId: row.user_id,
          role: roleName,
          isPlatformOwner:
            !!row.is_platform_owner || PLATFORM_ROLE_NAMES.has(roleName === "platform_owner" ? roleName : ""),
          companyId: row.company_id,
        };
      });
    },

    async listPermissionsForRole(role) {
      const { data, error } = await client
        .from("role_permissions")
        .select("permission")
        .eq("role", role as never);
      if (error) throw error;
      return (data ?? []).map((r) => (r as { permission: string }).permission);
    },
  };
}
