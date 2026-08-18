// Country & compliance intelligence — runtime layer.
//
// Everything produced here is strictly advisory. The settings stored by this
// module drive prompt context and review cadences; they never assert legal
// compliance.

import { getComplianceRepository, getExportRepository } from "@/lib/providers/registry";
import {
  DEFAULT_COUNTRY_CODE,
  isKnownFrameworkKey,
  resolveCountryConfig,
} from "@/lib/compliance-registry";
import type { ComplianceSettingsPatch } from "@/lib/providers/interfaces";

interface Ctx {
  supabase: unknown;
  userId: string;
}

export interface ComplianceSettingsView {
  country_code: string;
  primary_language: string;
  framework_keys: string[];
  review_interval_days: Record<string, number>;
  default_review_interval_days: number;
  updated_at: string | null;
  updated_by: string | null;
  /** True when nothing has been configured yet and country defaults apply. */
  is_default: boolean;
}

function defaultsFor(countryCode: string | null | undefined): ComplianceSettingsView {
  const cfg = resolveCountryConfig(countryCode);
  return {
    country_code: cfg.code,
    primary_language: cfg.defaultLanguage,
    framework_keys: [...cfg.applicableFrameworks],
    review_interval_days: {},
    default_review_interval_days: cfg.defaultReviewIntervalDays,
    updated_at: null,
    updated_by: null,
    is_default: true,
  };
}

export async function loadComplianceSettings(
  ctx: Ctx,
  companyId: string,
): Promise<ComplianceSettingsView> {
  const repo = getComplianceRepository({ supabase: ctx.supabase, userId: ctx.userId });
  let row = null;
  try {
    row = await repo.get(companyId);
  } catch {
    row = null;
  }
  if (!row) return defaultsFor(DEFAULT_COUNTRY_CODE);
  const cfg = resolveCountryConfig(row.countryCode);
  return {
    country_code: cfg.code,
    primary_language: row.primaryLanguage || cfg.defaultLanguage,
    framework_keys:
      row.frameworkKeys && row.frameworkKeys.length
        ? row.frameworkKeys.filter(isKnownFrameworkKey)
        : [...cfg.applicableFrameworks],
    review_interval_days: row.reviewIntervalDays ?? {},
    default_review_interval_days: cfg.defaultReviewIntervalDays,
    updated_at: row.updatedAt ?? null,
    updated_by: row.updatedBy ?? null,
    is_default: false,
  };
}

export async function saveComplianceSettings(
  ctx: Ctx,
  companyId: string,
  patch: ComplianceSettingsPatch,
): Promise<ComplianceSettingsView> {
  const dataCtx = { supabase: ctx.supabase, userId: ctx.userId };
  const repo = getComplianceRepository(dataCtx);
  const clean: ComplianceSettingsPatch = {
    countryCode: patch.countryCode ? resolveCountryConfig(patch.countryCode).code : undefined,
    primaryLanguage: patch.primaryLanguage?.slice(0, 8) || undefined,
    frameworkKeys: patch.frameworkKeys?.filter(isKnownFrameworkKey),
    reviewIntervalDays: patch.reviewIntervalDays
      ? Object.fromEntries(
          Object.entries(patch.reviewIntervalDays)
            .filter(([k]) => isKnownFrameworkKey(k) || k === "default")
            .map(([k, v]) => [k, Math.min(1825, Math.max(30, Math.round(Number(v) || 365)))]),
        )
      : undefined,
  };

  await repo.upsert(companyId, clean, ctx.userId);

  // Advisory audit trail — configuration changes are governance-relevant.
  try {
    await getExportRepository(dataCtx).writeAudit({
      companyId,
      userId: ctx.userId,
      module: "compliance",
      action: "compliance_settings_updated",
      resource: companyId,
      payload: {
        country_code: clean.countryCode ?? null,
        primary_language: clean.primaryLanguage ?? null,
        framework_keys: clean.frameworkKeys ?? null,
        review_interval_days: clean.reviewIntervalDays ?? null,
      } as never,
      severity: "info",
      success: true,
    });
  } catch {
    // Audit is best-effort; never block the settings save.
  }

  return loadComplianceSettings(ctx, companyId);
}
