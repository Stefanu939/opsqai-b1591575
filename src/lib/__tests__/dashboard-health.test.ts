import { describe, expect, it } from "vitest";
import { computeWorkspaceHealth, healthLabel } from "@/lib/dashboard-health";
import { buildFallbackInsights } from "@/lib/dashboard-insights";
import type { DashboardHealth, DashboardKnowledgeStatus, DashboardKpis } from "@/lib/providers/interfaces";

const kpis = (over: Partial<DashboardKpis> = {}): DashboardKpis => ({
  questionsAnswered: 0,
  questions30d: 0,
  questionsToday: 0,
  avgConfidence: 0,
  openGaps: 0,
  criticalSops: 0,
  documents: 0,
  faqs: 0,
  aiAudits: 0,
  auditEvents: 0,
  activeUsers: 0,
  ...over,
});

describe("workspace health", () => {
  it("scores an empty workspace low, credit coming only from having no gaps", () => {
    const h = computeWorkspaceHealth({
      documents: 0,
      criticalSops: 0,
      openGaps: 0,
      avgConfidence: 0,
      faqs: 0,
      lastAuditScore: 0,
    });
    expect(h.score).toBe(15);
    expect(h.label).toBe("Needs attention");
  });

  it("clamps components and never exceeds 100", () => {
    const h = computeWorkspaceHealth({
      documents: 500,
      criticalSops: 50,
      openGaps: 0,
      avgConfidence: 1,
      faqs: 100,
      lastAuditScore: 100,
    });
    expect(h.score).toBe(100);
    expect(h.label).toBe("Excellent");
  });

  it("penalises open gaps without going negative", () => {
    const many = computeWorkspaceHealth({
      documents: 20,
      criticalSops: 5,
      openGaps: 200,
      avgConfidence: 0.9,
      faqs: 10,
      lastAuditScore: 80,
    });
    const none = computeWorkspaceHealth({
      documents: 20,
      criticalSops: 5,
      openGaps: 0,
      avgConfidence: 0.9,
      faqs: 10,
      lastAuditScore: 80,
    });
    expect(many.score).toBeLessThan(none.score);
    expect(many.score).toBeGreaterThanOrEqual(0);
  });

  it("labels bands consistently", () => {
    expect(healthLabel(85)).toBe("Excellent");
    expect(healthLabel(70)).toBe("Good");
    expect(healthLabel(50)).toBe("Fair");
    expect(healthLabel(49)).toBe("Needs attention");
  });
});

describe("fallback insights", () => {
  const health: DashboardHealth = { score: 72, label: "Good", breakdown: {} };
  const status: DashboardKnowledgeStatus = { complete: 3, inProgress: 1, missing: 2 };

  it("summarises real signals", () => {
    const out = buildFallbackInsights({
      kpis: kpis({ openGaps: 4, questionsToday: 7, questions30d: 91 }),
      health,
      top: [{ code: "SOP-1", title: "Onboarding", usage: 12, updatedAt: null }],
      status,
    });
    expect(out.some((l) => l.includes("72/100"))).toBe(true);
    expect(out.some((l) => l.includes("4 open knowledge gap"))).toBe(true);
    expect(out.some((l) => l.includes("Onboarding"))).toBe(true);
  });

  it("never returns an empty list", () => {
    const out = buildFallbackInsights({
      kpis: kpis({ questionsToday: 0 }),
      health: { score: 0, label: "Needs attention", breakdown: {} },
      top: [],
      status: { complete: 0, inProgress: 0, missing: 0 },
    });
    expect(out.length).toBeGreaterThan(0);
  });
});
