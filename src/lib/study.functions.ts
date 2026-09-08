// Management Center analytics for the public OPSQAI study (cloud only).
// Aggregates only — individual responses are never exposed to the UI.
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { STUDY_QUESTIONS } from "@/i18n/pages/study";

export interface StudyAnalytics {
  total: number;
  contacts: number;
  pilotInterest: number;
  byLocale: Array<{ label: string; count: number }>;
  byCountry: Array<{ label: string; count: number }>;
  byQuestion: Array<{ id: string; rows: Array<{ label: string; count: number }> }>;
}

function toRows(dist: Record<string, number> | undefined): Array<{ label: string; count: number }> {
  return Object.entries(dist ?? {})
    .map(([label, count]) => ({ label, count: Number(count) }))
    .sort((a, b) => b.count - a.count);
}

export const getStudyAnalytics = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<StudyAnalytics> => {
    await requirePlatformAdmin(context as never);
    const admin = await getCloudSupabaseAdmin("study");

    const { data: bench } = await admin.rpc("study_benchmark");
    const b = (bench ?? {}) as {
      total?: number;
      by_country?: Record<string, number>;
      by_question?: Record<string, Record<string, number>>;
    };

    const { data: locales } = await admin.from("study_responses").select("locale");
    const localeDist: Record<string, number> = {};
    for (const row of locales ?? []) {
      const key = (row.locale as string) ?? "en";
      localeDist[key] = (localeDist[key] ?? 0) + 1;
    }

    const { count: contacts } = await admin
      .from("study_contacts")
      .select("id", { count: "exact", head: true });
    const { count: pilots } = await admin
      .from("study_contacts")
      .select("id", { count: "exact", head: true })
      .eq("wants_pilot", true);

    return {
      total: Number(b.total ?? 0),
      contacts: contacts ?? 0,
      pilotInterest: pilots ?? 0,
      byLocale: toRows(localeDist),
      byCountry: toRows(b.by_country),
      byQuestion: STUDY_QUESTIONS.map((q) => ({ id: q.id, rows: toRows(b.by_question?.[q.id]) })),
    };
  });

export const exportStudyReportPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context as never);
    const admin = await getCloudSupabaseAdmin("study");
    const { data: bench } = await admin.rpc("study_benchmark");
    const b = (bench ?? {}) as { total?: number; by_question?: Record<string, Record<string, number>> };
    const total = Number(b.total ?? 0);

    const rows: string[][] = [];
    for (const q of STUDY_QUESTIONS) {
      for (const [opt, count] of Object.entries(b.by_question?.[q.id] ?? {})) {
        const c = Number(count);
        rows.push([q.id, opt, String(c), total > 0 ? `${Math.round((c / total) * 100)}%` : "—"]);
      }
    }

    const { renderTablePdf } = await import("@/lib/transport/table-pdf.server");
    const bytes = await renderTablePdf({
      title: "OPSQAI European Operations Study 2026",
      subtitle: `${total} anonymous responses`,
      headers: ["Question", "Answer", "Responses", "Share"],
      rows,
      generatedLabel: `Generated ${new Date().toLocaleString()}`,
    });
    return {
      filename: `opsqai-study-${new Date().toISOString().slice(0, 10)}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  });
