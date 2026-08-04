import type { Pool } from "pg";
import type { IRbacAdminRepository, PermissionRecord, RoleRecord } from "@/lib/providers/interfaces";

export function createPgRbacAdminRepository({ pool }: { pool: Pool }): IRbacAdminRepository {
  return {
    async listPermissions() {
      const { rows } = await pool.query<PermissionRecord>(
        "SELECT key, label, category, description FROM public.permissions ORDER BY category, label",
      );
      return rows;
    },
    async listRoles() {
      const { rows } = await pool.query<{
        key: string; name: string; description: string | null; is_system: boolean;
        is_protected: boolean; permissions: string[] | null;
      }>(`SELECT r.key, r.name, r.description, r.is_system, r.is_protected,
                 array_remove(array_agg(rp.permission_key ORDER BY rp.permission_key), NULL) AS permissions
            FROM public.roles r LEFT JOIN public.role_permissions rp ON rp.role_key = r.key
           GROUP BY r.key ORDER BY r.is_protected DESC, r.name`);
      return rows.map((r) => ({ key: r.key, name: r.name, description: r.description,
        isSystem: r.is_system, isProtected: r.is_protected, permissions: r.permissions ?? [] }));
    },
    async createRole(input) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "INSERT INTO public.roles (key, name, description) VALUES ($1,$2,$3)",
          [input.key, input.name, input.description ?? null],
        );
        for (const permission of input.permissions) {
          await client.query(
            "INSERT INTO public.role_permissions (role_key, permission_key) VALUES ($1,$2)",
            [input.key, permission],
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }
    },
    async updateRole(key, input) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "UPDATE public.roles SET name=$2, description=$3, updated_at=NOW() WHERE key=$1",
          [key, input.name, input.description ?? null],
        );
        await client.query("DELETE FROM public.role_permissions WHERE role_key=$1", [key]);
        for (const permission of input.permissions) {
          await client.query(
            "INSERT INTO public.role_permissions (role_key, permission_key) VALUES ($1,$2)",
            [key, permission],
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }
    },
    async deleteRole(key) {
      const { rows } = await pool.query<{ is_protected: boolean }>(
        "SELECT is_protected FROM public.roles WHERE key=$1", [key],
      );
      if (!rows[0]) throw new Error("Role not found");
      if (rows[0].is_protected) throw new Error("Protected roles cannot be deleted");
      const { rows: assigned } = await pool.query("SELECT 1 FROM public.user_roles WHERE role=$1 LIMIT 1", [key]);
      if (assigned.length) throw new Error("Remove this role from all users before deleting it");
      await pool.query("DELETE FROM public.roles WHERE key=$1", [key]);
    },
  };
}