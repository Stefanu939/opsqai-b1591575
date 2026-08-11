import type {
  DashboardHealth,
  DashboardKnowledgeStatus,
  DashboardKpis,
  DashboardTopSop,
} from "@/lib/providers/interfaces";

/**
 * Deterministic executive bullets used when the AI summariser is unavailable
 * (which is the normal path for Self-Hosted installs without a local model).
 */
export function buildFallbackInsights(o: {
  kpis: DashboardKpis;
  health: DashboardHealth;
  top: DashboardTopSop[];
  status: DashboardKnowledgeStatus;
}): string[] {
  const out: string[] = [];
  if (o.health?.score != null)
    out.push(`Workspace health is ${o.health.score}/100 — ${o.health.label}.`);
  if (o.kpis?.openGaps > 0) out.push(`${o.kpis.openGaps} open knowledge gap(s) require attention.`);
  if (o.kpis?.questionsToday != null)
    out.push(`${o.kpis.questionsToday} questions answered today (last 30d: ${o.kpis.questions30d}).`);
  if (Array.isArray(o.top) && o.top[0]?.title)
    out.push(`Most accessed SOP this month: ${o.top[0].title}.`);
  if (o.status?.missing > 0)
    out.push(`${o.status.missing} missing knowledge items detected from gap analysis.`);
  return out.length ? out : ["Workspace is quiet — no significant operational signals."];
}
