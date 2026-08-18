// Self-Hosted IComplianceRepository — backed by public.compliance_settings.
import type { Pool } from "pg";
import type {
  ComplianceSettingsPatch,
  ComplianceSettingsRecord,
  IComplianceRepository,
} from "@/lib/providers/interfaces";
import { resolveCountryConfig } from "@/lib/compliance-registry";

export interface PgComplianceRepositoryDeps {
  pool: Pool;
}

interface Row {
  company_id: string;
  country_code: string;
  primary_language: string;
  framework_keys: string[];
  review_interval_days: Record<string, number>;
  updated_by: string | null;
  updated_at: string;
}

function toRecord(r: Row): ComplianceSettingsRecord {
  return {
    companyId: r.company_id,
    countryCode: r.country_code,
    primaryLanguage: r.primary_language,
    frameworkKeys: r.framework_keys ?? [],
    reviewIntervalDays: r.review_interval_days ?? {},
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
  };
}

export function createPgComplianceRepository(deps: PgComplianceRepositoryDeps): IComplianceRepository {
  const { pool } = deps;
  return {
    async get(companyId) {
      const { rows } = await pool.query<Row>(
        `SELECT * FROM public.compliance_settings WHERE company_id = $1`,
        [companyId],
      );
      return rows[0] ? toRecord(rows[0]) : null;
    },

    async upsert(companyId, patch, actorId) {
      const existing = await this.get(companyId);
      const cfg = resolveCountryConfig(patch.countryCode ?? existing?.countryCode);
      const countryCode = patch.countryCode ?? existing?.countryCode ?? cfg.code;
      const primaryLanguage = patch.primaryLanguage ?? existing?.primaryLanguage ?? cfg.defaultLanguage;
      const frameworkKeys =
        patch.frameworkKeys ?? existing?.frameworkKeys ?? cfg.applicableFrameworks;
      const reviewIntervalDays =
        patch.reviewIntervalDays ?? existing?.reviewIntervalDays ?? { default: cfg.defaultReviewIntervalDays };

      const { rows } = await pool.query<Row>(
        `INSERT INTO public.compliance_settings
           (company_id, country_code, primary_language, framework_keys, review_interval_days, updated_by, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6, now())
         ON CONFLICT (company_id) DO UPDATE SET
           country_code = $2,
           primary_language = $3,
           framework_keys = $4,
           review_interval_days = $5,
           updated_by = $6,
           updated_at = now()
         RETURNING *`,
        [companyId, countryCode, primaryLanguage, frameworkKeys, JSON.stringify(reviewIntervalDays), actorId],
      );
      return toRecord(rows[0]);
    },
  };
}

export const pgComplianceRepositoryFactory =
  (deps: PgComplianceRepositoryDeps) => (_dataCtx: unknown) => createPgComplianceRepository(deps);
