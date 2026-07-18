// Self-Hosted IRoleRepository — backed by public.user_roles.
//
// `role_permissions` is not modelled on Self-Hosted v1. Permissions are
// derived from a fixed role→permission map below — enough to keep the
// admin server functions functional without a table. This mirrors the
// business rules encoded in the Cloud `has_permission` RPC.

import type { Pool } from "pg";

import type {
  IRoleRepository,
  RoleAssignment,
  RoleAssignmentDetailed,
} from "@/lib/providers/interfaces";

export interface PgRoleRepositoryDeps {
  pool: Pool;
}

/**
 * Fixed role→permission map. Kept intentionally small: only permissions
 * currently referenced by the migrated server functions are enumerated.
 * Extend alongside new features as they migrate off Supabase.
 */
const ROLE_PERMS: Record<string, ReadonlyArray<string>> = {
  platform_owner: ["*"],
  platform_admin: ["*"],
  admin: [
    "user.create",
    "user.update",
    "user.delete",
    "department.manage",
    "platform.manage",
  ],
  manager: ["user.update", "department.manage"],
  supervisor: ["user.update"],
  team_leader: [],
  operator: [],
  employee: [],
  viewer: [],
};

function permittedForRoles(roles: string[], permission: string): boolean {
  for (const r of roles) {
    const perms = ROLE_PERMS[r];
    if (!perms) continue;
    if (perms.includes("*")) return true;
    if (perms.includes(permission)) return true;
  }
  return false;
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

    async addRole(userId, role, _companyId) {
      // Self-Hosted single-tenant: company_id is ignored.
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

    async removeNonPlatformRoles(userId) {
      await pool.query(
        `DELETE FROM public.user_roles
          WHERE user_id = $1
            AND role NOT IN ('platform_admin', 'platform_owner')`,
        [userId],
      );
    },

    async isPlatformOwner(userId) {
      // Self-Hosted has no `is_platform_owner` flag column — ownership
      // is represented by the `platform_owner` role name.
      const { rows } = await pool.query(
        `SELECT 1 FROM public.user_roles
           WHERE user_id = $1 AND role = 'platform_owner' LIMIT 1`,
        [userId],
      );
      return rows.length > 0;
    },

    async hasPermission(userId, permission) {
      const { rows } = await pool.query<{ role: string }>(
        "SELECT role FROM public.user_roles WHERE user_id = $1",
        [userId],
      );
      return permittedForRoles(rows.map((r) => r.role), permission);
    },

    async listAssignments(userIds): Promise<RoleAssignment[]> {
      const sql = userIds && userIds.length > 0
        ? "SELECT user_id, role FROM public.user_roles WHERE user_id = ANY($1)"
        : "SELECT user_id, role FROM public.user_roles";
      const params = userIds && userIds.length > 0 ? [userIds] : [];
      const { rows } = await pool.query<{ user_id: string; role: string }>(sql, params);
      return rows.map((r) => ({ userId: r.user_id, role: r.role }));
    },

    async listAssignmentsDetailed(userIds): Promise<RoleAssignmentDetailed[]> {
      const sql = userIds && userIds.length > 0
        ? "SELECT user_id, role FROM public.user_roles WHERE user_id = ANY($1)"
        : "SELECT user_id, role FROM public.user_roles";
      const params = userIds && userIds.length > 0 ? [userIds] : [];
      const { rows } = await pool.query<{ user_id: string; role: string }>(sql, params);
      return rows.map((r) => ({
        userId: r.user_id,
        role: r.role,
        isPlatformOwner: r.role === "platform_owner",
        companyId: null,
      }));
    },

    async listPermissionsForRole(role) {
      const perms = ROLE_PERMS[role];
      if (!perms) return [];
      if (perms.includes("*")) {
        // Return the union of every explicit permission so consumers see
        // a concrete list rather than the wildcard.
        const all = new Set<string>();
        for (const rp of Object.values(ROLE_PERMS)) {
          for (const p of rp) if (p !== "*") all.add(p);
        }
        return [...all];
      }
      return [...perms];
    },
  };
}
