import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { getActorRoles, getProfileCompany, requirePermission } from "@/lib/authorization";

async function resolveCompany(context: { supabase: any; userId: string }, hint?: string | null) {
  await requirePermission(context, "dashboard.view");
  const actor = await getActorRoles(context.supabase, context.userId);
  const isPlatform = actor.isPlatformAdmin;
  let companyId = hint ?? null;
  if (!companyId || !isPlatform) {
    companyId = (await getProfileCompany(context.supabase, context.userId)) ?? companyId;
  }
  if (!companyId && isPlatform) {
    const { data: firstCompany } = await context.supabase
      .from("companies")
      .select("id")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    companyId = firstCompany?.id ?? null;
  }
  if (!companyId) throw new Error("No company");
  return { companyId, isPlatform };
}

const CompanyArg = z.object({ companyId: z.string().uuid().optional().nullable() }).optional();

export const getDashboardOverview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyArg.parse(d) ?? {})
  .handler(async ({ data, context }) => {
    const { companyId } = await resolveCompany(context, data?.companyId ?? null);
    const [kpis, health, status, top, critical, lastAudit] = await Promise.all([
      context.supabase.rpc("dashboard_kpis", { p_company: companyId }),
      context.supabase.rpc("dashboard_health", { p_company: companyId }),
      context.supabase.rpc("dashboard_knowledge_status", { p_company: companyId }),
      context.supabase.rpc("dashboard_top_sops", { p_company: companyId, p_limit: 5 }),
      context.supabase.rpc("dashboard_critical_sops", { p_company: companyId }),
      context.supabase.rpc("dashboard_last_ai_audit", { p_company: companyId }),
    ]);
    return {
      kpis: kpis.data ?? {},
      health: health.data ?? { score: 0, label: "—", breakdown: {} },
      knowledgeStatus: status.data ?? { complete: 0, inProgress: 0, missing: 0 },
      topSops: top.data ?? [],
      criticalSops: critical.data ?? [],
      lastAudit: lastAudit.data ?? null,
    };
  });

const ActivityArg = z.object({
  companyId: z.string().uuid().optional().nullable(),
  from: z.string(),
  to: z.string(),
  bucket: z.enum(["hour", "day", "week"]).default("day"),
});
export const getDashboardActivity = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ActivityArg.parse(d))
  .handler(async ({ data, context }) => {
    const { companyId } = await resolveCompany(context, data.companyId ?? null);
    const { data: rows, error } = await context.supabase.rpc("dashboard_activity", {
      p_company: companyId,
      p_from: data.from,
      p_to: data.to,
      p_bucket: data.bucket,
    });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

/**
 * AI-generated operational insights (executive bullets).
 * Strict: only renders facts already computed; the LLM only summarises numbers.
 */
export const getExecutiveInsights = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyArg.parse(d) ?? {})
  .handler(async ({ data, context }) => {
    const { companyId } = await resolveCompany(context, data?.companyId ?? null);
    const [{ data: kpis }, { data: health }, { data: top }, { data: status }] = await Promise.all([
      context.supabase.rpc("dashboard_kpis", { p_company: companyId }),
      context.supabase.rpc("dashboard_health", { p_company: companyId }),
      context.supabase.rpc("dashboard_top_sops", { p_company: companyId, p_limit: 3 }),
      context.supabase.rpc("dashboard_knowledge_status", { p_company: companyId }),
    ]);

    const apiKey = process.env.LOVABLE_API_KEY;
    const fallback = buildFallbackInsights({ kpis, health, top, status });
    if (!apiKey) return { insights: fallback };
    try {
      const { generateText } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
      const gw = createLovableAiGatewayProvider(apiKey);
      const { text } = await generateText({
        model: gw("google/gemini-3-flash-preview"),
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

function buildFallbackInsights(o: { kpis: any; health: any; top: any; status: any }): string[] {
  const out: string[] = [];
  if (o.health?.score != null)
    out.push(`Workspace health is ${o.health.score}/100 — ${o.health.label}.`);
  if (o.kpis?.openGaps > 0) out.push(`${o.kpis.openGaps} open knowledge gap(s) require attention.`);
  if (o.kpis?.questionsToday != null)
    out.push(
      `${o.kpis.questionsToday} questions answered today (last 30d: ${o.kpis.questions30d}).`,
    );
  if (Array.isArray(o.top) && o.top[0]?.title)
    out.push(`Most accessed SOP this month: ${o.top[0].title}.`);
  if (o.status?.missing > 0)
    out.push(`${o.status.missing} missing knowledge items detected from gap analysis.`);
  return out.length ? out : ["Workspace is quiet — no significant operational signals."];
}

const SaveLayoutArg = z.object({ layout: z.any() });
export const saveDashboardLayout = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => SaveLayoutArg.parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("profiles")
      .update({ dashboard_layout: data.layout })
      .eq("id", context.userId);
    return { ok: true };
  });

export const getDashboardLayout = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("dashboard_layout")
      .eq("id", context.userId)
      .maybeSingle();
    return { layout: data?.dashboard_layout ?? null };
  });

const SearchArg = z.object({
  q: z.string().min(1),
  companyId: z.string().uuid().optional().nullable(),
});
export const globalSearch = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => SearchArg.parse(d))
  .handler(async ({ data, context }) => {
    const { companyId } = await resolveCompany(context, data.companyId ?? null);
    const { data: rows, error } = await context.supabase.rpc("search_everywhere", {
      p_company: companyId,
      p_q: data.q,
      p_limit: 8,
    });
    if (error) throw new Error(error.message);
    return { results: rows ?? [] };
  });
