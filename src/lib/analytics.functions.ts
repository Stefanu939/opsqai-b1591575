import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePermission, getProfileCompany } from "@/lib/authorization";
import { assertModuleForCompany } from "@/lib/license-enforcement.server";
import { getCloudSupabase } from "@/lib/providers/not-available";

export const getKnowledgeAnalytics = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePermission(context, "analytics.view");
    const companyId = await getProfileCompany(getCloudSupabase(context, "analytics"), context.userId);
    await assertModuleForCompany(
      companyId ?? "00000000-0000-0000-0000-000000000000",
      "analytics",
    );

    const supa = getCloudSupabase(context, "analytics");
    const sinceIso = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const outdatedCutoff = new Date(Date.now() - 180 * 24 * 3600 * 1000).toISOString();

    const [
      { data: questions },
      { data: msgs },
      { data: gaps },
      { data: docs },
      { data: faqs },
      { data: fb },
    ] = await Promise.all([
      supa
        .from("audit_log")
        .select("question, sources, created_at")
        .gte("created_at", sinceIso)
        .limit(2000),
      supa
        .from("messages")
        .select("role, confidence, created_at")
        .eq("role", "assistant")
        .gte("created_at", sinceIso)
        .limit(5000),
      supa
        .from("knowledge_gaps")
        .select("id, status, occurrences, question_sample")
        .eq("status", "open"),
      supa.from("knowledge_documents").select("id, title, doc_code, updated_at, is_active"),
      supa.from("faqs").select("id, question_en, updated_at"),
      supa.from("message_feedback").select("rating"),
    ]);

    // Top questions
    const qCounts: Record<string, number> = {};
    for (const r of questions ?? []) {
      const q = (r.question ?? "").toLowerCase().trim().slice(0, 120);
      if (q) qCounts[q] = (qCounts[q] ?? 0) + 1;
    }
    const topQuestions = Object.entries(qCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Most used SOPs
    const docCounts: Record<string, { title: string; count: number }> = {};
    for (const r of questions ?? []) {
      const srcs = (r.sources ?? []) as Array<{
        type: string;
        document_id?: string;
        title?: string;
      }>;
      for (const s of srcs) {
        if (s.type === "document" && s.document_id) {
          docCounts[s.document_id] = {
            title: s.title ?? "Document",
            count: (docCounts[s.document_id]?.count ?? 0) + 1,
          };
        }
      }
    }
    const topDocs = Object.entries(docCounts)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Most used FAQs
    const faqCounts: Record<string, { title: string; count: number }> = {};
    for (const r of questions ?? []) {
      const srcs = (r.sources ?? []) as Array<{ type: string; id?: string; title?: string }>;
      for (const s of srcs) {
        if (s.type === "faq" && s.id) {
          faqCounts[s.id] = { title: s.title ?? "FAQ", count: (faqCounts[s.id]?.count ?? 0) + 1 };
        }
      }
    }
    const topFaqs = Object.entries(faqCounts)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const confidences = (msgs ?? [])
      .map((m) => (m as { confidence: number | null }).confidence)
      .filter((x): x is number => typeof x === "number");
    const avgConfidence = confidences.length
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;
    const lowConfidenceCount = confidences.filter((c) => c < 0.55).length;

    const outdatedSops = (docs ?? []).filter((d) => d.is_active && d.updated_at < outdatedCutoff);

    // Usage per day
    const usageByDay: Record<string, number> = {};
    for (const m of msgs ?? []) {
      const day = (m.created_at as string).slice(0, 10);
      usageByDay[day] = (usageByDay[day] ?? 0) + 1;
    }
    const usage = Object.entries(usageByDay)
      .sort()
      .map(([day, count]) => ({ day, count }));

    const positive = (fb ?? []).filter((f) => f.rating === 1).length;
    const negative = (fb ?? []).filter((f) => f.rating === -1).length;

    return {
      topQuestions,
      topDocs,
      topFaqs,
      openGaps: gaps ?? [],
      unansweredCount: (gaps ?? []).reduce((a, g) => a + g.occurrences, 0),
      lowConfidenceCount,
      outdatedSops: outdatedSops.map((d) => ({
        id: d.id,
        title: d.title,
        doc_code: d.doc_code,
        updated_at: d.updated_at,
      })),
      avgConfidence,
      totalQuestions: questions?.length ?? 0,
      totalDocs: (docs ?? []).filter((d) => d.is_active).length,
      totalFaqs: faqs?.length ?? 0,
      usage,
      positive,
      negative,
    };
  });
