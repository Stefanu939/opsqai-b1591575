// Self-Hosted IRoleRepository — backed by public.user_roles.
//
// role_permissions is not modelled on Self-Hosted v1 (permissions are
// derived in code from the role enum); listPermissionsForRole returns
// an empty array until the table is added.

import type { Pool } from "pg";

import type { IRoleRepository, RoleAssignment } from "@/lib/providers/interfaces";

export interface PgRoleRepositoryDeps {
  pool: Pool;
}

export function createPgRoleRepository(deps: PgRoleRepositoryDeps): IRoleRepository {
  const { pool } = deps;

  return {
    async listRolesForUser(userId) {
      const { rows } = await pool.query<{ role: string }>(
        "SELECT role FROM public.user_roles WHERE user_id = $1",
        [userId],
      );
      return rows.map((r) => r.role);
    },

    async hasRole(userId, role) {
      const { rows } = await pool.query(
        "SELECT 1 FROM public.user_roles WHERE user_id = $1 AND role = $2 LIMIT 1",
        [userId, role],
      );
      return rows.length > 0;
    },

    async addRole(userId, role) {
      await pool.query(
        `INSERT INTO public.user_roles (user_id, role) VALUES ($1, $2)
           ON CONFLICT (user_id, role) DO NOTHING`,
        [userId, role],
      );
    },

    async removeRole(userId, role) {
      await pool.query(
        "DELETE FROM public.user_roles WHERE user_id = $1 AND role = $2",
        [userId, role],
      );
    },

    async removeAllRoles(userId) {
      await pool.query("DELETE FROM public.user_roles WHERE user_id = $1", [userId]);
    },

    async listAssignments(userIds): Promise<RoleAssignment[]> {
      const sql = userIds && userIds.length > 0
        ? "SELECT user_id, role FROM public.user_roles WHERE user_id = ANY($1)"
        : "SELECT user_id, role FROM public.user_roles";
      const params = userIds && userIds.length > 0 ? [userIds] : [];
      const { rows } = await pool.query<{ user_id: string; role: string }>(sql, params);
      return rows.map((r) => ({ userId: r.user_id, role: r.role }));
    },

    async listPermissionsForRole() {
      return [];
    },
  };
}
