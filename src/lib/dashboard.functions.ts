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


// --------------------------------------------------------------------
// Phase 2 — management overview (seats, get-started, maintenance, KPIs,
// integrations). Repository-backed; both providers already implement the
// underlying repos (profiles/departments/academy/knowledge/integrations),
// so no new provider surface is introduced here.
// --------------------------------------------------------------------

export const getManagementOverview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyArg.parse(d) ?? {})
  .handler(async ({ data, context }) => {
    const { companyId, repo } = await dashboardContext(context, data?.companyId ?? null);
    const [
      { getProfileRepository, getDepartmentRepository, getAcademyRepository, getKnowledgeRepository, getIntegrationRepository },
      { getLicensingProvider, getBackupService },
    ] = await Promise.all([
      import("@/lib/providers/registry"),
      import("@/lib/providers"),
    ]);

    const [profiles, departments, learningPaths, documents, kpis, lastAudit, entitlements] =
      await Promise.all([
        getProfileRepository(context.supabase).listByCompany(companyId).catch(() => []),
        getDepartmentRepository(context.supabase).list(companyId).catch(() => []),
        getAcademyRepository(context.supabase).listLearningPaths(companyId).catch(() => []),
        getKnowledgeRepository(context.supabase).listDocuments(companyId, false).catch(() => []),
        repo.kpis(companyId),
        repo.lastAiAudit(companyId),
        getLicensingProvider()
          .entitlements()
          .catch(() => null),
      ]);

    // Seats
    const totalUsers = profiles.length;
    const seatLimit = entitlements?.unlimited ? null : (entitlements?.seats ?? null);

    // Get-started tips (real completion signals)
    const tips = [
      { id: "departments", label: "Create departments", done: departments.length > 0, to: "/app/organization" },
      { id: "invite", label: "Invite your team", done: totalUsers > 1, to: "/app/users" },
      { id: "knowledge", label: "Add notes & knowledge", done: documents.length > 0, to: "/app/knowledge" },
      { id: "sops", label: "Import SOPs and FAQs", done: kpis.faqs > 0 || documents.length > 0, to: "/app/knowledge" },
      { id: "academy", label: "Create courses", done: learningPaths.length > 0, to: "/app/academy" },
    ];

    // Maintenance status — read only what already exists; never invent data.
    let doctorOverall: string = "n/a";
    try {
      const { runDoctor } = await import("@/lib/platform/doctor");
      doctorOverall = (await runDoctor()).overall;
    } catch {
      /* not applicable off self-host, or probe unavailable */
    }
    let lastMaintenanceAt: string | null = null;
    try {
      const snapshots = await getBackupService().list();
      lastMaintenanceAt = snapshots[0]?.createdAt ?? null;
    } catch {
      lastMaintenanceAt = null;
    }
    const nextMaintenanceAt = entitlements?.maintenanceExpiresAt
      ? new Date(entitlements.maintenanceExpiresAt * 1000).toISOString()
      : null;

    // Knowledge freshness — reuse document-lifecycle helpers, don't duplicate.
    const { summarizeLifecycle } = await import("@/lib/document-lifecycle");
    const freshness = summarizeLifecycle(
      documents.map((d) => ({
        created_at: d.created_at,
        updated_at: d.updated_at,
        information_updated_at: d.information_updated_at,
        last_reviewed_at: d.last_reviewed_at,
        review_interval_days: d.review_interval_days,
      })),
    );

    // Integrations — connection state only; no OAuth here.
    const providers = ["outlook", "gmail", "teams"] as const;
    const integRepo = getIntegrationRepository(context.supabase);
    const integrations = Object.fromEntries(
      await Promise.all(
        providers.map(async (p) => {
          const row = await integRepo.find(companyId, p).catch(() => null);
          return [p, { status: row?.status ?? "disconnected", connectedAt: row?.connectedAt ?? null }];
        }),
      ),
    ) as Record<(typeof providers)[number], { status: string; connectedAt: string | null }>;

    return {
      seats: { limit: seatLimit, used: totalUsers, unlimited: !!entitlements?.unlimited },
      tips,
      maintenance: {
        overall: doctorOverall,
        lastMaintenanceAt,
        nextMaintenanceAt,
      },
      kpis: {
        auditScore: lastAudit?.score ?? null,
        auditCreatedAt: lastAudit?.createdAt ?? null,
        knowledgeCoveragePct:
          kpis.documents > 0 ? Math.round((freshness.fresh / kpis.documents) * 100) : null,
        freshness,
      },
      integrations,
    };
  });
