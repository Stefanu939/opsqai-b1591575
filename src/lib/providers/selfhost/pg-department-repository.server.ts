// Self-Hosted IDepartmentRepository — backed by public.departments
// (migration 0007_admin_surface.sql). Nullifies public.users.department_id
// on delete to keep the FK-less reference consistent.

import type { Pool } from "pg";

import type {
  DepartmentRecord,
  IDepartmentRepository,
} from "@/lib/providers/interfaces";

export interface PgDepartmentRepositoryDeps {
  pool: Pool;
  tenantCompanyId: string;
}

interface Row {
  id: string;
  name: string;
  company_id: string | null;
}

const mapRow = (r: Row): DepartmentRecord => ({
  id: r.id,
  name: r.name,
  companyId: r.company_id,
});

export function createPgDepartmentRepository(
  deps: PgDepartmentRepositoryDeps,
): IDepartmentRepository {
  const { pool, tenantCompanyId } = deps;

  return {
    async list(_companyId) {
      // Single-tenant: ignore companyId and return everything.
      const { rows } = await pool.query<Row>(
        "SELECT id, name, company_id FROM public.departments ORDER BY name",
      );
      return rows.map(mapRow);
    },
    async findByNameCI(_companyId, name) {
      const { rows } = await pool.query<Row>(
        `SELECT id, name, company_id FROM public.departments
          WHERE LOWER(name) = LOWER($1) LIMIT 1`,
        [name],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async create(input) {
      const { rows } = await pool.query<Row>(
        `INSERT INTO public.departments (name, company_id)
         VALUES ($1, $2)
         RETURNING id, name, company_id`,
        [input.name, input.companyId ?? tenantCompanyId],
      );
      return mapRow(rows[0]);
    },
    async delete(id, _companyId) {
      const { rows } = await pool.query<{ id: string }>(
        "SELECT id FROM public.departments WHERE id = $1",
        [id],
      );
      if (!rows[0]) throw new Error("department not found");
      await pool.query(
        "UPDATE public.users SET department_id = NULL WHERE department_id = $1",
        [id],
      );
      await pool.query("DELETE FROM public.departments WHERE id = $1", [id]);
    },
  };
}
