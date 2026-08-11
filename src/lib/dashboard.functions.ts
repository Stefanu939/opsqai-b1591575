import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { uuidString } from "@/lib/zod-uuid";

/**
 * Dashboard read models are repository-backed: Self-Hosted computes them from
 * the local PostgreSQL schema, Cloud delegates to the `dashboard_*` SQL
 * functions. Neither path touches a Supabase client from this module.
 */
async function dashboardContext(context: unknown, hint?: string | null) {
  const [{ resolveDashboardCompany }, { getDashboardRepository }] = await Promise.all([
    import("@/lib/dashboard-search.server"),
    import("@/lib/providers/registry"),
  ]);
  const ctx = context as { supabase: unknown; userId: string };
  const { companyId, isPlatform } = await resolveDashboardCompany(ctx as never, hint ?? null);
  return { companyId, isPlatform, repo: getDashboardRepository(ctx.supabase) };
}

const CompanyArg = z.object({ companyId: uuidString().optional().nullable() }).optional();

export const getDashboardOverview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyArg.parse(d) ?? {})
  .handler(async ({ data, context }) => {
    const { companyId, repo } = await dashboardContext(context, data?.companyId ?? null);
    const [kpis, health, knowledgeStatus, topSops, criticalSops, lastAudit] = await Promise.all([
      repo.kpis(companyId),
      repo.health(companyId),
      repo.knowledgeStatus(companyId),
      repo.topSops(companyId, 5),
      repo.criticalSops(companyId),
      repo.lastAiAudit(companyId),
    ]);
    return { kpis, health, knowledgeStatus, topSops, criticalSops, lastAudit };
  });

const ActivityArg = z.object({
  companyId: uuidString().optional().nullable(),
  from: z.string(),
  to: z.string(),
  bucket: z.enum(["hour", "day", "week"]).default("day"),
});
export const getDashboardActivity = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ActivityArg.parse(d))
  .handler(async ({ data, context }) => {
    const { companyId, repo } = await dashboardContext(context, data.companyId ?? null);
    return { rows: await repo.activity(companyId, data.from, data.to, data.bucket) };
  });

/**
 * AI-generated operational insights (executive bullets).
 * Strict: only renders facts already computed; the LLM only summarises numbers.
 */
export const getExecutiveInsights = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyArg.parse(d) ?? {})
  .handler(async ({ data, context }) => {
    const { companyId, repo } = await dashboardContext(context, data?.companyId ?? null);
    const [kpis, health, top, status] = await Promise.all([
      repo.kpis(companyId),
      repo.health(companyId),
      repo.topSops(companyId, 3),
      repo.knowledgeStatus(companyId),
    ]);

    const { buildFallbackInsights } = await import("@/lib/dashboard-insights");
    const fallback = buildFallbackInsights({ kpis, health, top, status });
    try {
      const { generateAiText } = await import("@/lib/ai-provider.server");
      const text = await generateAiText({
        role: "chat",
        temperature: 0.4,
        prompt: `You are an operations analyst. Produce exactly 4 short executive insights (max 18 words each) as plain JSON array of strings. Base ONLY on this JSON, do not invent numbers.\n\n${JSON.stringify({ kpis, health, topSops: top, knowledgeStatus: status })}\n\nReturn JSON only, e.g. ["...","...","...","..."].`,
      });
      const m = text.match(/\[[\s\S]*\]/);
      if (m) {
        const arr = JSON.parse(m[0]);
        if (Array.isArray(arr) && arr.length > 0) return { insights: arr.slice(0, 6).map(String) };
      }
    } catch {
      /* fall through */
    }
    return { insights: fallback };
  });

const SaveLayoutArg = z.object({ layout: z.any() });
export const saveDashboardLayout = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => SaveLayoutArg.parse(d))
  .handler(async ({ data, context }) => {
    const { getDashboardRepository } = await import("@/lib/providers/registry");
    await getDashboardRepository(context.supabase).saveLayout(context.userId, data.layout);
    return { ok: true };
  });

export const getDashboardLayout = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { getDashboardRepository } = await import("@/lib/providers/registry");
    const layout = await getDashboardRepository(context.supabase).getLayout(context.userId);
    return { layout: layout ?? null };
  });

const SearchArg = z.object({
  q: z.string().min(1),
  companyId: uuidString().optional().nullable(),
});
export const globalSearch = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => SearchArg.parse(d))
  .handler(async ({ data, context }) => {
    // Repository-backed so Self-Hosted (local PostgreSQL) never reaches the
    // Cloud data client; Cloud resolves the same repositories over Supabase.
    const { resolveDashboardCompany, searchEverywhere } = await import(
      "@/lib/dashboard-search.server"
    );
    const { companyId } = await resolveDashboardCompany(context, data.companyId ?? null);
    return { results: await searchEverywhere(context, companyId, data.q, 8) };
  });

