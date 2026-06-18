import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "manager");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [usersResp, activeResp, docsResp, faqsResp, qResp] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("knowledge_documents").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("faqs").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("audit_log").select("id", { count: "exact", head: true }),
    ]);

    // Most used documents: count source entries from audit_log (best effort, limited)
    const { data: recentAudit } = await supabaseAdmin
      .from("audit_log").select("question, sources").gte("created_at", since30).limit(500);

    const docCounts = new Map<string, { title: string; count: number }>();
    const questionCounts = new Map<string, number>();
    for (const row of recentAudit ?? []) {
      const srcs = Array.isArray(row.sources) ? (row.sources as unknown as Array<{ type: string; title: string; code?: string }>) : [];
      for (const s of srcs) {
        if (s.type === "document") {
          const key = s.code || s.title;
          const cur = docCounts.get(key) || { title: s.code ? `${s.code} — ${s.title}` : s.title, count: 0 };
          cur.count++;
          docCounts.set(key, cur);
        }
      }
      const q = (row.question || "").toLowerCase().trim().slice(0, 80);
      if (q) questionCounts.set(q, (questionCounts.get(q) || 0) + 1);
    }
    const topDocs = [...docCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    const topQuestions = [...questionCounts.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([question, count]) => ({ question, count }));

    return {
      totalUsers: usersResp.count ?? 0,
      activeUsers: activeResp.count ?? 0,
      totalDocs: docsResp.count ?? 0,
      totalFaqs: faqsResp.count ?? 0,
      totalQuestions: qResp.count ?? 0,
      topDocs,
      topQuestions,
    };
  });

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const can = (roles ?? []).some((r) => r.role === "admin" || r.role === "manager");
    if (!can) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("audit_log")
      .select("id, user_id, thread_id, question, answer_preview, sources, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id, full_name").in("id", userIds);
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    return (data ?? []).map((r) => ({ ...r, user_name: nameById.get(r.user_id) ?? null }));
  });
