// Cloud IRoleRepository — thin wrapper over Supabase `user_roles` +
// `role_permissions`. See supabase-profile-repository.server.ts for the
// two-flavour pattern (user-scoped vs admin).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import type { IRoleRepository, RoleAssignment } from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

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

    async addRole(userId, role) {
      const { error } = await client
        .from("user_roles")
        .insert({ user_id: userId, role: role as never });
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
