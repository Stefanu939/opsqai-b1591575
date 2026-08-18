// Server functions for country & compliance intelligence settings.

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";

const UpdateRequest = z.object({
  country_code: z.string().min(2).max(16).optional(),
  primary_language: z.string().min(2).max(8).optional(),
  framework_keys: z.array(z.string().min(2).max(40)).max(24).optional(),
  review_interval_days: z.record(z.string(), z.number().int().min(30).max(1825)).optional(),
});

export const getComplianceSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const [{ resolveDashboardCompany }, { loadComplianceSettings }] = await Promise.all([
      import("@/lib/dashboard-search.server"),
      import("@/lib/compliance-core.server"),
    ]);
    const { companyId } = await resolveDashboardCompany(context as never, null);
    return loadComplianceSettings(
      { supabase: context.supabase, userId: context.userId },
      companyId,
    );
  });

export const updateComplianceSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => UpdateRequest.parse(d))
  .handler(async ({ data, context }) => {
    const [{ requireAnyPermission }, { resolveDashboardCompany }, { saveComplianceSettings }] =
      await Promise.all([
        import("@/lib/authorization"),
        import("@/lib/dashboard-search.server"),
        import("@/lib/compliance-core.server"),
      ]);
    await requireAnyPermission(context, ["company.manage", "platform.manage"]);
    const { companyId } = await resolveDashboardCompany(context as never, null);
    return saveComplianceSettings(
      { supabase: context.supabase, userId: context.userId },
      companyId,
      {
        countryCode: data.country_code,
        primaryLanguage: data.primary_language,
        frameworkKeys: data.framework_keys,
        reviewIntervalDays: data.review_interval_days,
      },
    );
  });
