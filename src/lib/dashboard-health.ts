/**
 * Workspace health scoring — identical weighting to the Cloud
 * `dashboard_health()` SQL function, extracted so Self-Hosted computes the
 * same score locally and the formula can be unit-tested.
 */
export type HealthInputs = {
  documents: number;
  criticalSops: number;
  openGaps: number;
  avgConfidence: number; // 0..1
  faqs: number;
  lastAuditScore: number; // 0..100
};

export function healthLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Needs attention";
}

export function computeWorkspaceHealth(i: HealthInputs) {
  const score =
    Math.min(100, i.documents * 5) * 0.2 +
    Math.min(100, i.criticalSops * 20) * 0.1 +
    Math.max(0, 100 - i.openGaps * 8) * 0.15 +
    Math.min(100, i.avgConfidence * 100) * 0.25 +
    Math.min(100, i.faqs * 10) * 0.1 +
    i.lastAuditScore * 0.2;
  const rounded = Math.round(score);
  return {
    score: rounded,
    label: healthLabel(rounded),
    breakdown: {
      documents: i.documents,
      criticalSops: i.criticalSops,
      openGaps: i.openGaps,
      avgConfidence: Math.round(i.avgConfidence * 100) / 100,
      faqs: i.faqs,
      lastAuditScore: Math.round(i.lastAuditScore),
    },
  };
}
