import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";

/**
 * Control-center read model for the Self-Hosted dashboard.
 *
 * One authenticated call returns the "what needs attention" lanes the
 * operational overview shows: deadlines, people away, upcoming events,
 * safety risk and the latest audit signals. Every query is individually
 * guarded so an install without an optional module (Transport, Academy)
 * simply contributes nothing instead of failing the whole dashboard.
 */

export type ControlCenterItem = {
  id: string;
  kind: "document" | "audit" | "incident" | "academy" | "event" | "absence";
  title: string;
  detail?: string;
  date?: string | null;
  severity: "critical" | "warning" | "info";
};

export type ControlCenterData = {
  deadlines: ControlCenterItem[];
  absences: ControlCenterItem[];
  events: ControlCenterItem[];
  safety: ControlCenterItem[];
  audits: ControlCenterItem[];
  counts: { critical: number; warning: number; info: number };
  generatedAt: string;
};

const dayMs = 86_400_000;

function toIso(v: unknown): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / dayMs);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildControlCenter(sb: any): Promise<ControlCenterData> {
  {
    const nowIso = new Date().toISOString();
    const horizonIso = new Date(Date.now() + 60 * dayMs).toISOString();
    const todayDate = nowIso.slice(0, 10);
    const horizonDate = horizonIso.slice(0, 10);

    const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch {
        return fallback;
      }
    };

    const deadlines: ControlCenterItem[] = [];
    const absences: ControlCenterItem[] = [];
    const events: ControlCenterItem[] = [];
    const safety: ControlCenterItem[] = [];
    const audits: ControlCenterItem[] = [];

    // Expiring / expired operational documents (Transport module).
    await safe(async () => {
      const r = await sb
        .from("transport_documents")
        .select("id, label, doc_type, expires_on, owner_kind")
        .not("expires_on", "is", null)
        .lte("expires_on", horizonDate)
        .order("expires_on", { ascending: true })
        .limit(12);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (r.data ?? []) as any[]) {
        const iso = toIso(row.expires_on);
        const d = daysUntil(iso);
        deadlines.push({
          id: `doc-${row.id}`,
          kind: "document",
          title: row.label || row.doc_type || "Document",
          detail: row.owner_kind ?? undefined,
          date: iso,
          severity: d != null && d < 0 ? "critical" : d != null && d <= 14 ? "warning" : "info",
        });
      }
    }, undefined);

    // Academy assignments with a due date still open.
    await safe(async () => {
      const r = await sb
        .from("academy_enrollments")
        .select("id, due_at, status, mandatory")
        .not("due_at", "is", null)
        .neq("status", "completed")
        .lte("due_at", horizonIso)
        .order("due_at", { ascending: true })
        .limit(10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (r.data ?? []) as any[]) {
        const iso = toIso(row.due_at);
        const d = daysUntil(iso);
        deadlines.push({
          id: `enr-${row.id}`,
          kind: "academy",
          title: row.mandatory ? "Mandatory training due" : "Training due",
          detail: row.status ?? undefined,
          date: iso,
          severity: d != null && d < 0 ? "critical" : "warning",
        });
      }
    }, undefined);

    // Approved time off starting soon or running now.
    await safe(async () => {
      const r = await sb
        .from("time_off_requests")
        .select("id, starts_on, ends_on, status, reason")
        .eq("status", "approved")
        .gte("ends_on", todayDate)
        .lte("starts_on", horizonDate)
        .order("starts_on", { ascending: true })
        .limit(12);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (r.data ?? []) as any[]) {
        absences.push({
          id: `off-${row.id}`,
          kind: "absence",
          title: row.reason || "Approved leave",
          detail: `${String(row.starts_on).slice(0, 10)} → ${String(row.ends_on).slice(0, 10)}`,
          date: toIso(row.starts_on),
          severity: String(row.starts_on).slice(0, 10) <= todayDate ? "warning" : "info",
        });
      }
    }, undefined);

    // Upcoming calendar events.
    await safe(async () => {
      const r = await sb
        .from("calendar_events")
        .select("id, title, kind, starts_at, location")
        .gte("starts_at", nowIso)
        .lte("starts_at", horizonIso)
        .order("starts_at", { ascending: true })
        .limit(10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (r.data ?? []) as any[]) {
        const iso = toIso(row.starts_at);
        const d = daysUntil(iso);
        events.push({
          id: `ev-${row.id}`,
          kind: "event",
          title: row.title ?? "Event",
          detail: row.location || row.kind || undefined,
          date: iso,
          severity: d != null && d <= 2 ? "warning" : "info",
        });
      }
    }, undefined);

    // Open safety-relevant incidents.
    await safe(async () => {
      const r = await sb
        .from("transport_incidents")
        .select("id, title, severity, status, category, occurred_at")
        .not("status", "in", '("closed","cancelled")')
        .order("occurred_at", { ascending: false })
        .limit(10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (r.data ?? []) as any[]) {
        safety.push({
          id: `inc-${row.id}`,
          kind: "incident",
          title: row.title ?? "Incident",
          detail: [row.category, row.status].filter(Boolean).join(" · "),
          date: toIso(row.occurred_at),
          severity:
            row.severity === "critical" || row.severity === "high"
              ? "critical"
              : row.severity === "medium"
                ? "warning"
                : "info",
        });
      }
    }, undefined);

    // Latest AI audits.
    await safe(async () => {
      const r = await sb
        .from("ai_audits")
        .select("id, created_at, score, summary")
        .order("created_at", { ascending: false })
        .limit(4);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (r.data ?? []) as any[]) {
        const score = Number(row.score ?? 0);
        audits.push({
          id: `aud-${row.id}`,
          kind: "audit",
          title: `Audit score ${row.score ?? "—"}`,
          detail:
            typeof row.summary === "string" && row.summary.trim()
              ? row.summary.slice(0, 140)
              : undefined,
          date: toIso(row.created_at),
          severity: score > 0 && score < 60 ? "critical" : score > 0 && score < 80 ? "warning" : "info",
        });
      }
    }, undefined);

    const all = [...deadlines, ...absences, ...events, ...safety, ...audits];
    return {
      deadlines: deadlines.slice(0, 12),
      absences: absences.slice(0, 10),
      events: events.slice(0, 8),
      safety: safety.slice(0, 8),
      audits: audits.slice(0, 4),
      counts: {
        critical: all.filter((i) => i.severity === "critical").length,
        warning: all.filter((i) => i.severity === "warning").length,
        info: all.filter((i) => i.severity === "info").length,
      },
      generatedAt: nowIso,
    };
  }
}

export const getControlCenter = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<ControlCenterData> =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buildControlCenter(context.supabase as any),
  );

/**
 * One-page A4 "Operational overview" PDF built from the same read model the
 * dashboard shows, returned as base64 so the browser can download it.
 */
export const exportControlCenterPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await buildControlCenter(context.supabase as any);
    const { generatePdf } = await import("@/lib/generators/pdf.server");

    const rows = (items: ControlCenterItem[]) =>
      items.map((i) => [
        i.severity.toUpperCase(),
        i.title,
        i.detail ?? "",
        i.date ? new Date(i.date).toISOString().slice(0, 10) : "",
      ]);
    const headers = ["Level", "Item", "Detail", "Date"];
    const blocks: Parameters<typeof generatePdf>[0]["blocks"] = [
      {
        type: "kpis",
        items: [
          { label: "Critical", value: String(data.counts.critical) },
          { label: "Warning", value: String(data.counts.warning) },
          { label: "Informational", value: String(data.counts.info) },
        ],
      },
    ];
    const push = (heading: string, items: ControlCenterItem[]) => {
      blocks.push({ type: "h2", text: heading });
      if (items.length === 0) blocks.push({ type: "p", text: "Nothing to report." });
      else blocks.push({ type: "table", headers, rows: rows(items) });
    };
    push("Deadlines", data.deadlines);
    push("Safety and incidents", data.safety);
    push("People away", data.absences);
    push("Upcoming events", data.events);
    push("Latest audits", data.audits);

    const bytes = await generatePdf({
      title: "Operational overview",
      subtitle: new Date(data.generatedAt).toLocaleString("en-GB"),
      blocks,
      meta: { documentType: "Operational overview", brand: "OPSQAI" },
    });
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return { filename: `opsqai-overview-${data.generatedAt.slice(0, 10)}.pdf`, base64: btoa(binary) };
  });
