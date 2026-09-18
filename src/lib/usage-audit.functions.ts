// Management Center: external usage audit for a self-hosted installation.
//
// Reads the aggregate-only snapshots the installation reports. There is no
// customer content here by construction — the installation never sends any.
// Platform-admin only.

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";

export type UsageMetricsRecord = Record<string, number | null>;

export interface UsageSnapshot {
  received_at: string;
  client_timestamp: string | null;
  app_version: string | null;
  window_days: number;
  metrics: UsageMetricsRecord;
}

export interface UsageAudit {
  install_id: string;
  organization_name: string | null;
  app_version: string | null;
  last_heartbeat_at: string | null;
  license_expires_at: string | null;
  license_kind: string | null;
  /** Newest first. */
  snapshots: UsageSnapshot[];
  latest: UsageMetricsRecord | null;
  /** Oldest snapshot in range — the pilot baseline to compare against. */
  baseline: UsageMetricsRecord | null;
  reporting: boolean;
}

/** Ordered metric keys with human labels, used by both the screen and the PDF. */
export const USAGE_METRIC_LABELS: Array<[string, string]> = [
  ["users_total", "Users provisioned"],
  ["users_active_7d", "Active users (7 days)"],
  ["users_active_30d", "Active users (30 days)"],
  ["sessions_30d", "Work sessions (30 days)"],
  ["session_minutes_30d", "Minutes in app (30 days)"],
  ["ai_questions_30d", "AI questions asked"],
  ["ai_answers_with_source_30d", "AI answers with a source"],
  ["ai_avg_confidence", "Average answer confidence"],
  ["documents_total", "Documents in knowledge base"],
  ["documents_added_30d", "Documents added (30 days)"],
  ["faqs_total", "FAQ entries"],
  ["knowledge_gaps_open", "Open knowledge gaps"],
  ["approvals_30d", "Approvals recorded (30 days)"],
  ["expiry_alerts_open", "Deadlines live (next 60 days)"],
  ["expiry_alerts_resolved_30d", "Deadlines renewed (30 days)"],
  ["incidents_open", "Open incidents"],
  ["incidents_closed_30d", "Incidents closed (30 days)"],
  ["academy_assigned_30d", "Trainings assigned (30 days)"],
  ["academy_completed_30d", "Trainings completed (30 days)"],
  ["errors_30d", "Failed actions (30 days)"],
  ["last_backup_days_ago", "Days since last backup"],
];

async function loadUsageAudit(installId: string, days: number): Promise<UsageAudit> {
  const supabaseAdmin = await getCloudSupabaseAdmin("usage-audit");
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [{ data: install }, { data: rows }, { data: licenses }] = await Promise.all([
    supabaseAdmin
      .from("selfhost_installations")
      .select("install_id, organization_name, app_version, last_heartbeat_at")
      .eq("install_id", installId)
      .maybeSingle(),
    supabaseAdmin
      .from("selfhost_usage_snapshots")
      .select("received_at, client_timestamp, app_version, window_days, metrics")
      .eq("install_id", installId)
      .gte("received_at", since)
      .order("received_at", { ascending: false })
      .limit(400),
    supabaseAdmin
      .from("licenses")
      .select("kind, expires_at, issued_at")
      .eq("install_id", installId)
      .order("issued_at", { ascending: false })
      .limit(1),
  ]);

  const snapshots: UsageSnapshot[] = (rows ?? []).map((r) => ({
    received_at: String(r.received_at),
    client_timestamp: (r.client_timestamp as string | null) ?? null,
    app_version: (r.app_version as string | null) ?? null,
    window_days: Number(r.window_days ?? 30),
    metrics: (r.metrics ?? {}) as UsageMetricsRecord,
  }));

  const license = licenses?.[0] ?? null;
  return {
    install_id: installId,
    organization_name: install?.organization_name ?? null,
    app_version: install?.app_version ?? null,
    last_heartbeat_at: install?.last_heartbeat_at ?? null,
    license_expires_at: (license?.expires_at as string | null) ?? null,
    license_kind: (license?.kind as string | null) ?? null,
    snapshots,
    latest: snapshots[0]?.metrics ?? null,
    baseline: snapshots.length > 1 ? snapshots[snapshots.length - 1]!.metrics : null,
    reporting: snapshots.length > 0,
  };
}

const validate = (input: { installId: string; days?: number }) => ({
  installId: String(input.installId).slice(0, 64),
  days: Math.min(Math.max(Number(input.days ?? 90), 7), 365),
});

export const getUsageAudit = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(validate)
  .handler(async ({ context, data }): Promise<UsageAudit> => {
    await requirePlatformAdmin(context);
    return loadUsageAudit(data.installId, data.days);
  });

/**
 * Deliverable 7 of the pilot SOW: a usage report the customer can read,
 * built purely from aggregate numbers.
 */
export const exportUsageAuditPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(validate)
  .handler(async ({ context, data }) => {
    await requirePlatformAdmin(context);
    const audit = await loadUsageAudit(data.installId, data.days);
    const { generatePdf } = await import("@/lib/generators/pdf.server");

    const fmt = (v: number | null | undefined) =>
      v == null ? "—" : Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
    const delta = (key: string) => {
      const a = audit.latest?.[key];
      const b = audit.baseline?.[key];
      if (a == null || b == null) return "—";
      const d = a - b;
      return `${d > 0 ? "+" : ""}${Math.round(d * 100) / 100}`;
    };

    const blocks: Parameters<typeof generatePdf>[0]["blocks"] = [
      {
        type: "kpis",
        items: [
          { label: "Active users (30d)", value: fmt(audit.latest?.["users_active_30d"]) },
          { label: "Minutes in app (30d)", value: fmt(audit.latest?.["session_minutes_30d"]) },
          { label: "AI questions (30d)", value: fmt(audit.latest?.["ai_questions_30d"]) },
        ],
      },
      { type: "h2", text: "Installation" },
      {
        type: "table",
        headers: ["Field", "Value"],
        rows: [
          ["Installation", audit.organization_name ?? audit.install_id],
          ["Installation id", audit.install_id],
          ["App version", audit.app_version ?? "—"],
          ["License kind", audit.license_kind ?? "—"],
          [
            "License valid until",
            audit.license_expires_at ? audit.license_expires_at.slice(0, 10) : "—",
          ],
          [
            "Last report",
            audit.last_heartbeat_at ? audit.last_heartbeat_at.slice(0, 16).replace("T", " ") : "—",
          ],
          ["Reports in range", String(audit.snapshots.length)],
        ],
      },
      { type: "h2", text: "Usage measurement" },
      {
        type: "p",
        text: "Aggregate figures only. The installation reports counts and averages; no document, name, message or personal data leaves the customer's server.",
      },
      {
        type: "table",
        headers: ["Indicator", "Now", "Start of range", "Change"],
        rows: USAGE_METRIC_LABELS.map(([key, label]) => [
          label,
          fmt(audit.latest?.[key]),
          fmt(audit.baseline?.[key]),
          delta(key),
        ]),
      },
    ];

    const bytes = await generatePdf({
      title: "Usage audit",
      subtitle: `${audit.organization_name ?? audit.install_id} · ${new Date().toISOString().slice(0, 10)}`,
      blocks,
      meta: { documentType: "Usage audit", brand: "OPSQAI" },
    });
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return {
      filename: `opsqai-usage-${audit.install_id}-${new Date().toISOString().slice(0, 10)}.pdf`,
      base64: btoa(binary),
    };
  });
