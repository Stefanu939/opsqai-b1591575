// Cloud IComplianceRepository — backed by public.compliance_settings via
// the user-scoped Supabase client so RLS still applies.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  ComplianceSettingsRecord,
  IComplianceRepository,
} from "@/lib/providers/interfaces";
import { resolveCountryConfig } from "@/lib/compliance-registry";

type Client = SupabaseClient<Database>;

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

export function createSupabaseComplianceRepository(client: Client): IComplianceRepository {
  return {
    async get(companyId) {
      const { data, error } = await client
        .from("compliance_settings" as never)
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? toRecord(data as unknown as Row) : null;
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

      const { data, error } = await client
        .from("compliance_settings" as never)
        .upsert(
          {
            company_id: companyId,
            country_code: countryCode,
            primary_language: primaryLanguage,
            framework_keys: frameworkKeys,
            review_interval_days: reviewIntervalDays,
            updated_by: actorId,
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "company_id" },
        )
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return toRecord(data as unknown as Row);
    },
  };
}

export const supabaseComplianceRepositoryFactory =
  (dataCtx: unknown): IComplianceRepository =>
    createSupabaseComplianceRepository(dataCtx as Client);
