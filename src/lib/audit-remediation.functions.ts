// Server functions for AI Audit auto-remediation (generate SOP / FAQ from a
// recommendation, then close the originating knowledge gap).

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { uuidString } from "@/lib/zod-uuid";

const ItemSchema = z.object({
  kind: z.enum(["sop", "faq"]),
  question: z.string().min(4).max(600),
  department: z.string().max(120).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  language: z.enum(["en", "de", "ro"]).optional(),
  gap_id: uuidString().nullable().optional(),
});

export const autoRemediateRecommendation = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ItemSchema.parse(d))
  .handler(async ({ data, context }) => {
    const [{ requireAnyPermission }, { resolveDashboardCompany }, { remediateRecommendation }] =
      await Promise.all([
        import("@/lib/authorization"),
        import("@/lib/dashboard-search.server"),
        import("@/lib/audit-remediation.server"),
      ]);
    await requireAnyPermission(context, ["knowledge.manage", "sop.publish", "faq.create"]);
    const { companyId } = await resolveDashboardCompany(context as never, null);
    return remediateRecommendation(
      { supabase: context.supabase, userId: context.userId },
      companyId,
      {
        kind: data.kind,
        question: data.question,
        department: data.department ?? null,
        category: data.category ?? null,
        language: data.language ?? "en",
        gapId: data.gap_id ?? null,
      },
    );
  });

export const autoRemediateBatch = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ items: z.array(ItemSchema).min(1).max(10) }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ requireAnyPermission }, { resolveDashboardCompany }, { remediateRecommendation }] =
      await Promise.all([
        import("@/lib/authorization"),
        import("@/lib/dashboard-search.server"),
        import("@/lib/audit-remediation.server"),
      ]);
    await requireAnyPermission(context, ["knowledge.manage", "sop.publish", "faq.create"]);
    const { companyId } = await resolveDashboardCompany(context as never, null);
    const ctx = { supabase: context.supabase, userId: context.userId };

    const results: Array<{
      question: string;
      kind: "sop" | "faq";
      ok: boolean;
      title?: string;
      error?: string;
    }> = [];
    for (const item of data.items) {
      try {
        const r = await remediateRecommendation(ctx, companyId, {
          kind: item.kind,
          question: item.question,
          department: item.department ?? null,
          category: item.category ?? null,
          language: item.language ?? "en",
          gapId: item.gap_id ?? null,
        });
        results.push({ question: item.question, kind: item.kind, ok: true, title: r.title });
      } catch (e) {
        results.push({
          question: item.question,
          kind: item.kind,
          ok: false,
          error: e instanceof Error ? e.message : "generation_failed",
        });
      }
    }
    return { results, generated: results.filter((r) => r.ok).length };
  });
