import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  DashboardActivityRow,
  DashboardCriticalSop,
  DashboardHealth,
  DashboardKnowledgeStatus,
  DashboardKpis,
  DashboardTopSop,
  IDashboardRepository,
  AiAuditRecord,
  JsonLike,
} from "@/lib/providers/interfaces";

/**
 * Cloud dashboard read models — thin delegation to the existing
 * `dashboard_*` SECURITY DEFINER functions (unchanged behaviour).
 */
export function createSupabaseDashboardRepository(
  client: SupabaseClient<Database>,
): IDashboardRepository {
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const { data, error } = await (client as unknown as {
      rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    }).rpc(name, args);
    if (error) throw new Error(error.message);
    return data;
  };

  return {
    async kpis(companyId) {
      return ((await rpc("dashboard_kpis", { p_company: companyId })) ?? {}) as DashboardKpis;
    },
    async health(companyId) {
      return ((await rpc("dashboard_health", { p_company: companyId })) ?? {
        score: 0,
        label: "—",
        breakdown: {},
      }) as DashboardHealth;
    },
    async knowledgeStatus(companyId) {
      return ((await rpc("dashboard_knowledge_status", { p_company: companyId })) ?? {
        complete: 0,
        inProgress: 0,
        missing: 0,
      }) as DashboardKnowledgeStatus;
    },
    async topSops(companyId, limit) {
      return ((await rpc("dashboard_top_sops", { p_company: companyId, p_limit: limit })) ??
        []) as DashboardTopSop[];
    },
    async criticalSops(companyId) {
      return ((await rpc("dashboard_critical_sops", { p_company: companyId })) ??
        []) as DashboardCriticalSop[];
    },
    async lastAiAudit(companyId) {
      const row = (await rpc("dashboard_last_ai_audit", { p_company: companyId })) as
        | (Omit<AiAuditRecord, "createdAt" | "summary"> & { created_at: string })
        | null;
      if (!row) return null;
      return {
        id: row.id,
        score: row.score,
        maturity: row.maturity,
        passed: row.passed,
        warnings: row.warnings,
        critical: row.critical,
        summary: {} as JsonLike,
        createdAt: row.created_at,
      };
    },
    async activity(companyId, from, to, bucket) {
      return ((await rpc("dashboard_activity", {
        p_company: companyId,
        p_from: from,
        p_to: to,
        p_bucket: bucket,
      })) ?? []) as DashboardActivityRow[];
    },
    async getLayout(userId) {
      const { data, error } = await client
        .from("profiles")
        .select("dashboard_layout")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.dashboard_layout ?? null;
    },
    async saveLayout(userId, layout) {
      const { error } = await client
        .from("profiles")
        .update({ dashboard_layout: layout } as never)
        .eq("id", userId);
      if (error) throw new Error(error.message);
    },
  };
}
