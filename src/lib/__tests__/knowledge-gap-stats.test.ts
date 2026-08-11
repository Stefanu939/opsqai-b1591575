import { describe, expect, it } from "vitest";
import { buildKnowledgeGapStats } from "@/lib/knowledge-gap-stats";
import type { KnowledgeGapListRow } from "@/lib/providers/interfaces";

const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();

const gap = (over: Partial<KnowledgeGapListRow>): KnowledgeGapListRow => ({
  id: crypto.randomUUID(),
  question_sample: "How do I request leave?",
  question_normalized: "how do i request leave",
  occurrences: 1,
  first_seen: iso(5),
  last_seen: iso(1),
  status: "open",
  assignee_id: null,
  resolution: null,
  resolved_document_id: null,
  resolved_faq_id: null,
  department_id: null,
  created_by: null,
  confidence: null,
  source_thread_id: null,
  source_message_id: null,
  resolution_date: null,
  updated_at: iso(1),
  department_name: null,
  created_by_name: null,
  resolved_document: null,
  resolved_faq: null,
  ...over,
});

describe("knowledge gap stats", () => {
  it("counts open and in_progress as open work", () => {
    const s = buildKnowledgeGapStats([
      gap({ status: "open" }),
      gap({ status: "in_progress" }),
      gap({ status: "ignored" }),
    ]);
    expect(s.open).toBe(2);
  });

  it("ranks departments by occurrences and buckets unassigned", () => {
    const s = buildKnowledgeGapStats([
      gap({ department_name: "Ops", occurrences: 5 }),
      gap({ department_name: "Ops", occurrences: 3 }),
      gap({ department_name: null, occurrences: 4 }),
    ]);
    expect(s.topDepartments[0]).toEqual({ name: "Ops", count: 8 });
    expect(s.topDepartments[1]).toEqual({ name: "Unassigned", count: 4 });
  });

  it("only counts resolutions from the last 30 days as this month", () => {
    const s = buildKnowledgeGapStats([
      gap({ status: "resolved", resolution_date: iso(2) }),
      gap({ status: "resolved", resolution_date: iso(90) }),
    ]);
    expect(s.resolvedThisMonth).toBe(1);
    expect(s.totalResolved).toBe(2);
  });

  it("computes average resolution time in hours", () => {
    const first = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const done = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const s = buildKnowledgeGapStats([
      gap({ status: "resolved", first_seen: first, resolution_date: done }),
    ]);
    expect(Math.round(s.avgResolutionHours)).toBe(24);
  });

  it("returns a 30-point trend and surfaces the most requested open gap", () => {
    const s = buildKnowledgeGapStats([
      gap({ occurrences: 2, question_sample: "A" }),
      gap({ occurrences: 9, question_sample: "B" }),
    ]);
    expect(s.trend).toHaveLength(30);
    expect(s.mostRequested?.question_sample).toBe("B");
  });

  it("is safe on an empty workspace", () => {
    const s = buildKnowledgeGapStats([]);
    expect(s).toMatchObject({ open: 0, totalResolved: 0, avgConfidence: 0, avgResolutionHours: 0 });
    expect(s.mostRequested).toBeNull();
  });
});
