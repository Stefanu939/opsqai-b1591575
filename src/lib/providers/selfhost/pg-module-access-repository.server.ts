// Self-Hosted IModuleAccessRepository — backed by public.user_module_access.
import type { Pool } from "pg";
import type {
  IModuleAccessRepository,
  ModuleAccessRecord,
} from "@/lib/providers/interfaces";

export interface PgModuleAccessRepositoryDeps {
  pool: Pool;
}

interface Row {
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

export function createPgModuleAccessRepository(deps: PgModuleAccessRepositoryDeps): IModuleAccessRepository {
  const { pool } = deps;
  return {
    async listForUser(companyId, userId) {
      const { rows } = await pool.query<Row>(
        `SELECT user_id, company_id, module_key, granted_by, created_at
           FROM public.user_module_access
          WHERE company_id = $1 AND user_id = $2`,
        [companyId, userId],
      );
      return rows.map(toRecord);
    },

    async listForCompany(companyId) {
      const { rows } = await pool.query<Row>(
        `SELECT user_id, company_id, module_key, granted_by, created_at
           FROM public.user_module_access
          WHERE company_id = $1`,
        [companyId],
      );
      return rows.map(toRecord);
    },

    async replaceForUser(companyId, userId, moduleKeys, grantedBy) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `DELETE FROM public.user_module_access WHERE company_id = $1 AND user_id = $2`,
          [companyId, userId],
        );
        for (const moduleKey of moduleKeys) {
          await client.query(
            `INSERT INTO public.user_module_access (user_id, company_id, module_key, granted_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, company_id, module_key) DO NOTHING`,
            [userId, companyId, moduleKey, grantedBy],
          );
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    },
  };
}

export const pgModuleAccessRepositoryFactory =
  (deps: PgModuleAccessRepositoryDeps) => (_dataCtx: unknown) => createPgModuleAccessRepository(deps);
