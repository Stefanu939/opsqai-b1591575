import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth.server";
import { z } from "zod";
import { requireAnyPermission } from "@/lib/authorization";

export const listKnowledgeGaps = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("knowledge_gaps")
      .select(
        "id, question_sample, question_normalized, occurrences, first_seen, last_seen, status, assignee_id, resolution, resolved_document_id, resolved_faq_id, department_id, created_by, confidence, source_thread_id, source_message_id, resolution_date, updated_at",
      )
      .order("last_seen", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const gaps = (data ?? []) as Array<
      Record<string, unknown> & {
        department_id: string | null;
        created_by: string | null;
        resolved_document_id: string | null;
        resolved_faq_id: string | null;
      }
    >;

    const deptIds = Array.from(
      new Set(gaps.map((g) => g.department_id).filter(Boolean) as string[]),
    );
    const userIds = Array.from(new Set(gaps.map((g) => g.created_by).filter(Boolean) as string[]));
    const docIds = Array.from(
      new Set(gaps.map((g) => g.resolved_document_id).filter(Boolean) as string[]),
    );
    const faqIds = Array.from(
      new Set(gaps.map((g) => g.resolved_faq_id).filter(Boolean) as string[]),
    );

    const [deptsRes, usersRes, docsRes, faqsRes] = await Promise.all([
      deptIds.length
        ? context.supabase.from("departments").select("id, name").in("id", deptIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      userIds.length
        ? context.supabase.from("profiles").select("id, full_name").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      docIds.length
        ? context.supabase
            .from("knowledge_documents")
            .select("id, title, doc_code")
            .in("id", docIds)
        : Promise.resolve({ data: [] as { id: string; title: string; doc_code: string | null }[] }),
      faqIds.length
        ? context.supabase.from("faqs").select("id, question_en").in("id", faqIds)
        : Promise.resolve({ data: [] as { id: string; question_en: string | null }[] }),
    ]);
    const deptMap = new Map((deptsRes.data ?? []).map((d) => [d.id, d.name]));
    const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));
    const docMap = new Map((docsRes.data ?? []).map((d) => [d.id, d]));
    const faqMap = new Map((faqsRes.data ?? []).map((f) => [f.id, f]));

    return {
      gaps: gaps.map((g) => ({
        ...g,
        department_name: g.department_id ? (deptMap.get(g.department_id as string) ?? null) : null,
        created_by_name: g.created_by ? (userMap.get(g.created_by as string) ?? null) : null,
        resolved_document: g.resolved_document_id
          ? (docMap.get(g.resolved_document_id as string) ?? null)
          : null,
        resolved_faq: g.resolved_faq_id ? (faqMap.get(g.resolved_faq_id as string) ?? null) : null,
      })),
    };
  });

export const updateKnowledgeGap = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "in_progress", "resolved", "ignored"]).optional(),
        assignee_id: z.string().uuid().nullable().optional(),
        resolution: z.enum(["sop", "faq", "dismissed"]).nullable().optional(),
        resolved_document_id: z.string().uuid().nullable().optional(),
        resolved_faq_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "analytics.view"]);
    const { id, ...patch } = data;
    const update: Record<string, unknown> = { ...patch };
    if (patch.status === "resolved" && !("resolution_date" in update)) {
      update.resolution_date = new Date().toISOString();
    }
    const { error } = await context.supabase
      .from("knowledge_gaps")
      .update(update as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteKnowledgeGap = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "analytics.view"]);
    const { error } = await context.supabase.from("knowledge_gaps").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getKnowledgeGapStats = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { data: gaps } = await context.supabase
      .from("knowledge_gaps")
      .select(
        "id, status, occurrences, question_sample, department_id, confidence, resolution_date, first_seen, created_at, updated_at",
      );
    const list = (gaps ?? []) as Array<{
      id: string;
      status: string;
      occurrences: number;
      question_sample: string;
      department_id: string | null;
      confidence: number | null;
      resolution_date: string | null;
      first_seen: string;
      updated_at: string;
    }>;
    const open = list.filter((g) => g.status === "open" || g.status === "in_progress");
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const resolvedMonth = list.filter(
      (g) =>
        g.status === "resolved" && g.resolution_date && new Date(g.resolution_date) >= monthAgo,
    );
    const confs = list.map((g) => g.confidence).filter((c): c is number => typeof c === "number");
    const avgConfidence = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0;
    const mostRequested = [...open].sort((a, b) => b.occurrences - a.occurrences)[0] ?? null;

    const deptIds = Array.from(
      new Set(open.map((g) => g.department_id).filter(Boolean) as string[]),
    );
    const deptNames = new Map<string, string>();
    if (deptIds.length) {
      const { data: depts } = await context.supabase
        .from("departments")
        .select("id, name")
        .in("id", deptIds);
      for (const d of depts ?? []) deptNames.set(d.id, d.name);
    }
    const byDept = new Map<string, number>();
    for (const g of open) {
      const k = g.department_id ? (deptNames.get(g.department_id) ?? "Unassigned") : "Unassigned";
      byDept.set(k, (byDept.get(k) ?? 0) + g.occurrences);
    }
    const topDepartments = Array.from(byDept.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // 30-day trend (created)
    const trendBuckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendBuckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const g of list) {
      const key = (g.first_seen || g.updated_at).slice(0, 10);
      if (key in trendBuckets) trendBuckets[key] += 1;
    }
    const trend = Object.entries(trendBuckets).map(([date, count]) => ({ date, count }));

    // Avg resolution time (hours)
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
  });
