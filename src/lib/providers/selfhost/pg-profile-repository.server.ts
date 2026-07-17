// Self-Hosted IProfileRepository — profile fields live on public.users
// (see migration 0006_profile_fields.sql). Single-tenant install: the
// synthetic company_id is filled by the app layer and always identical.
//
// Server-only, Node-only.

import type { Pool } from "pg";

import type {
  IProfileRepository,
  ProfileCreateInput,
  ProfilePatch,
  ProfileRecord,
} from "@/lib/providers/interfaces";

interface Row {
  id: string;
  email: string | null;
  company_id: string | null;
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
  created_at: Date;
  updated_at: Date;
}

const COLS = `
  id, email, company_id, first_name, last_name, full_name, avatar_url,
  phone, position, department, department_id, is_active, language_pref,
  dashboard_layout, created_at, updated_at
`;

function mapRow(row: Row, tenantCompanyId: string): ProfileRecord {
  return {
    userId: row.id,
    companyId: row.company_id ?? tenantCompanyId,
    email: row.email,
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
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface PgProfileRepositoryDeps {
  pool: Pool;
  /** Synthetic single-tenant company id used to fill ProfileRecord.companyId. */
  tenantCompanyId: string;
}

export function createPgProfileRepository(deps: PgProfileRepositoryDeps): IProfileRepository {
  const { pool, tenantCompanyId } = deps;

  return {
    async findByUserId(userId) {
      const { rows } = await pool.query<Row>(
        `SELECT ${COLS} FROM public.users WHERE id = $1`,
        [userId],
      );
      return rows[0] ? mapRow(rows[0], tenantCompanyId) : null;
    },

    async updateByUserId(userId, patch: ProfilePatch) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      const push = (col: string, v: unknown) => {
        vals.push(v);
        sets.push(`${col} = $${vals.length}`);
      };
      if (patch.companyId !== undefined) push("company_id", patch.companyId);
      if (patch.firstName !== undefined) push("first_name", patch.firstName);
      if (patch.lastName !== undefined) push("last_name", patch.lastName);
      if (patch.fullName !== undefined) push("full_name", patch.fullName);
      if (patch.avatarUrl !== undefined) push("avatar_url", patch.avatarUrl);
      if (patch.phone !== undefined) push("phone", patch.phone);
      if (patch.position !== undefined) push("position", patch.position);
      if (patch.department !== undefined) push("department", patch.department);
      if (patch.departmentId !== undefined) push("department_id", patch.departmentId);
      if (patch.isActive !== undefined) push("is_active", patch.isActive);
      if (patch.languagePref !== undefined) push("language_pref", patch.languagePref);
      if (patch.dashboardLayout !== undefined)
        push("dashboard_layout", JSON.stringify(patch.dashboardLayout));
      if (sets.length === 0) {
        const cur = await this.findByUserId(userId);
        if (!cur) throw new Error(`profile not found: ${userId}`);
        return cur;
      }
      vals.push(userId);
      const { rows } = await pool.query<Row>(
        `UPDATE public.users SET ${sets.join(", ")}
           WHERE id = $${vals.length}
         RETURNING ${COLS}`,
        vals,
      );
      if (!rows[0]) throw new Error(`profile not found: ${userId}`);
      return mapRow(rows[0], tenantCompanyId);
    },

    async listByCompany(companyId) {
      // Single-tenant: all users belong to the synthetic tenant.
      const { rows } = await pool.query<Row>(
        `SELECT ${COLS} FROM public.users
          WHERE COALESCE(company_id, $1) = $1`,
        [companyId],
      );
      return rows.map((r) => mapRow(r, tenantCompanyId));
    },

    async create(input: ProfileCreateInput) {
      // On Self-Hosted, the user row is created by the auth flow
      // (createFirstAdmin or admin-invite). `create` here only fills in
      // the profile columns for an existing user.
      const { rows } = await pool.query<Row>(
        `UPDATE public.users SET
            company_id = COALESCE($2, company_id),
            first_name = $3, last_name = $4, full_name = $5,
            avatar_url = $6, phone = $7, position = $8,
            department = $9, department_id = $10,
            is_active = COALESCE($11, is_active),
            language_pref = COALESCE($12, language_pref),
            dashboard_layout = $13
          WHERE id = $1
        RETURNING ${COLS}`,
        [
          input.userId,
          input.companyId ?? null,
          input.firstName ?? null,
          input.lastName ?? null,
          input.fullName ?? null,
          input.avatarUrl ?? null,
          input.phone ?? null,
          input.position ?? null,
          input.department ?? null,
          input.departmentId ?? null,
          input.isActive ?? null,
          input.languagePref ?? null,
          input.dashboardLayout != null ? JSON.stringify(input.dashboardLayout) : null,
        ],
      );
      if (!rows[0]) throw new Error(`user not found: ${input.userId}`);
      return mapRow(rows[0], tenantCompanyId);
    },

    async deleteByUserId(userId) {
      // Profile columns are on the users row; deleting the user is the
      // auth provider's job. Here we clear profile fields only.
      await pool.query(
        `UPDATE public.users SET
            first_name = NULL, last_name = NULL, full_name = NULL,
            avatar_url = NULL, phone = NULL, position = NULL,
            department = NULL, department_id = NULL,
            dashboard_layout = NULL
          WHERE id = $1`,
        [userId],
      );
    },
  };
}
