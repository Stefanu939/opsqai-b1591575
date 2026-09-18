import { describe, it, expect } from "vitest";
import { UsageMetricsSchema, HeartbeatPayloadSchema } from "@/lib/selfhost-heartbeat-schema";
import { isMutatingPermission } from "@/lib/license-readonly.server";

const valid = {
  window_days: 30,
  users_total: 12,
  users_active_7d: 7,
  users_active_30d: 10,
  sessions_30d: 140,
  session_minutes_30d: 1820.5,
  ai_questions_30d: 310,
  ai_answers_with_source_30d: 298,
  ai_avg_confidence: 0.82,
  documents_total: 180,
  documents_added_30d: 24,
  faqs_total: 40,
  knowledge_gaps_open: 3,
  approvals_30d: 18,
  expiry_alerts_open: 9,
  expiry_alerts_resolved_30d: 6,
  incidents_open: 2,
  incidents_closed_30d: 4,
  academy_assigned_30d: 8,
  academy_completed_30d: 6,
  errors_30d: 1,
  last_backup_days_ago: 0.4,
};

describe("usage metrics stay numbers-only", () => {
  it("accepts the aggregate shape", () => {
    expect(UsageMetricsSchema.parse(valid).users_active_30d).toBe(10);
  });

  it("rejects any extra key — including one carrying content", () => {
    expect(() =>
      UsageMetricsSchema.parse({ ...valid, last_document_title: "Contract Ionescu" }),
    ).toThrow();
  });

  it("rejects text where a number belongs", () => {
    expect(() => UsageMetricsSchema.parse({ ...valid, users_total: "twelve" })).toThrow();
  });

  it("is optional on the heartbeat (opt-out installs send none)", () => {
    const beat = {
      installation_id: "inst-123",
      signed_token: "x".repeat(20),
      timestamp: new Date().toISOString(),
    };
    expect(HeartbeatPayloadSchema.parse(beat).usage ?? null).toBeNull();
    expect(HeartbeatPayloadSchema.parse({ ...beat, usage: valid }).usage?.sessions_30d).toBe(140);
  });
});

describe("read-only grace classifies permissions", () => {
  it("treats data-changing permissions as writes", () => {
    for (const p of ["faq.create", "sop.edit", "user.delete", "document.approve", "academy.assign"]) {
      expect(isMutatingPermission(p)).toBe(true);
    }
  });

  it("leaves reading, using and exporting allowed", () => {
    for (const p of ["dashboard.view", "chat.use", "reports.export", "audit.view"]) {
      expect(isMutatingPermission(p)).toBe(false);
    }
  });
});
