// Self-Hosted IIntegrationRepository — public.company_integrations (0008).

import type { Pool } from "pg";
import type {
  IIntegrationRepository,
  IntegrationRecord,
} from "@/lib/providers/interfaces";

export interface PgIntegrationRepositoryDeps {
  pool: Pool;
}

interface Row {
  company_id: string;
  provider: string;
  status: string;
  config: unknown;
  connected_at: Date | null;
  last_error: string | null;
}

const mapRow = (r: Row): IntegrationRecord => ({
  companyId: r.company_id,
  provider: r.provider,
  status: r.status,
  config: (r.config ?? {}) as Record<string, unknown>,
  connectedAt: r.connected_at ? r.connected_at.toISOString() : null,
  lastError: r.last_error,
});

export function createPgIntegrationRepository(
  deps: PgIntegrationRepositoryDeps,
): IIntegrationRepository {
  const { pool } = deps;
  return {
    async find(companyId, provider) {
      const { rows } = await pool.query<Row>(
        `SELECT company_id, provider, status, config, connected_at, last_error
           FROM public.company_integrations
          WHERE company_id = $1 AND provider = $2`,
        [companyId, provider],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async upsert(input) {
      await pool.query(
        `INSERT INTO public.company_integrations
           (company_id, provider, status, config, connected_at, connected_by, last_error)
         VALUES ($1,$2,$3,$4,$5,$6,NULL)
         ON CONFLICT (company_id, provider)
         DO UPDATE SET status = EXCLUDED.status,
                       config = EXCLUDED.config,
                       connected_at = EXCLUDED.connected_at,
                       connected_by = EXCLUDED.connected_by,
                       last_error = NULL,
                       updated_at = NOW()`,
        [
          input.companyId,
          input.provider,
          input.status,
          JSON.stringify(input.config),
          input.connectedAt,
          input.connectedBy,
        ],
      );
    },
    async update(companyId, provider, patch) {
      const sets: string[] = [];
      const values: unknown[] = [companyId, provider];
      let i = 3;
      if (patch.status !== undefined) {
        sets.push(`status = $${i++}`);
        values.push(patch.status);
      }
      if (patch.config !== undefined) {
        sets.push(`config = $${i++}`);
        values.push(JSON.stringify(patch.config));
      }
      if (patch.lastError !== undefined) {
        sets.push(`last_error = $${i++}`);
        values.push(patch.lastError);
      }
      if (sets.length === 0) return;
      sets.push(`updated_at = NOW()`);
      await pool.query(
        `UPDATE public.company_integrations SET ${sets.join(", ")}
          WHERE company_id = $1 AND provider = $2`,
        values,
      );
    },
  };
}
