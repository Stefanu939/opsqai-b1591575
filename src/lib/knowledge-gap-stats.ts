import type { KnowledgeGapListRow } from "@/lib/providers/interfaces";

/**
 * Pure aggregation over the enriched gap rows, shared by Cloud and
 * Self-Hosted so both products report identical knowledge-gap statistics.
 */
export function buildKnowledgeGapStats(list: KnowledgeGapListRow[], now = new Date()) {
  const open = list.filter((g) => g.status === "open" || g.status === "in_progress");

  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const resolvedMonth = list.filter(
    (g) => g.status === "resolved" && g.resolution_date && new Date(g.resolution_date) >= monthAgo,
  );

  const confs = list.map((g) => g.confidence).filter((c): c is number => typeof c === "number");
  const avgConfidence = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0;
  const mostRequested = [...open].sort((a, b) => b.occurrences - a.occurrences)[0] ?? null;

  const byDept = new Map<string, number>();
  for (const g of open) {
    const key = g.department_name ?? "Unassigned";
    byDept.set(key, (byDept.get(key) ?? 0) + g.occurrences);
  }
  const topDepartments = Array.from(byDept.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const trendBuckets: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    trendBuckets[d.toISOString().slice(0, 10)] = 0;
  }
  for (const g of list) {
    const key = (g.first_seen || g.updated_at).slice(0, 10);
    if (key in trendBuckets) trendBuckets[key] += 1;
  }
  const trend = Object.entries(trendBuckets).map(([date, count]) => ({ date, count }));

  const resolved = list.filter((g) => g.status === "resolved" && g.resolution_date);
  const avgResolutionHours = resolved.length
    ? resolved.reduce(
        (sum, g) =>
          sum + (new Date(g.resolution_date!).getTime() - new Date(g.first_seen).getTime()),
        0,
      ) /
      resolved.length /
      3_600_000
    : 0;

  return {
    open: open.length,
    resolvedThisMonth: resolvedMonth.length,
    avgConfidence,
    mostRequested,
    topDepartments,
    trend,
    avgResolutionHours,
    totalResolved: list.filter((g) => g.status === "resolved").length,
  };
}
