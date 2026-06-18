import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const isPlatformAdmin = (roles ?? []).some((r) => r.role === "platform_admin");
    const isAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "manager" || r.role === "platform_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // For company admins, scope everything to their company
    let companyFilter: string | null = null;
    if (!isPlatformAdmin) {
      const { data: prof } = await supabaseAdmin
        .from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
      companyFilter = prof?.company_id ?? null;
    }

    const scoped = <T extends { eq: (col: string, v: string) => T }>(q: T) =>
      companyFilter ? q.eq("company_id", companyFilter) : q;

    const [usersResp, activeResp, docsResp, faqsResp, qResp] = await Promise.all([
      scoped(supabaseAdmin.from("profiles").select("id", { count: "exact", head: true })),
      scoped(supabaseAdmin.from("profiles").select("id", { count: "exact", head: true })).eq("is_active", true),
      scoped(supabaseAdmin.from("knowledge_documents").select("id", { count: "exact", head: true })),
      scoped(supabaseAdmin.from("faqs").select("id", { count: "exact", head: true })),
      scoped(supabaseAdmin.from("audit_log").select("id", { count: "exact", head: true })),
    ]);

    let auditQuery = supabaseAdmin
      .from("audit_log").select("question, sources, company_id").gte("created_at", since30).limit(1000);
    if (companyFilter) auditQuery = auditQuery.eq("company_id", companyFilter);
    const { data: recentAudit } = await auditQuery;

    const docCounts = new Map<string, { title: string; count: number }>();
    const questionCounts = new Map<string, number>();
    const perCompanyQuestions = new Map<string, number>();
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
      if (row.company_id) perCompanyQuestions.set(row.company_id, (perCompanyQuestions.get(row.company_id) || 0) + 1);
    }
    const topDocs = [...docCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    const topQuestions = [...questionCounts.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([question, count]) => ({ question, count }));

    // Platform-admin only: per-company breakdown
    let companyBreakdown: Array<{ id: string; name: string; users: number; docs: number; questions30d: number; active: boolean }> = [];
    if (isPlatformAdmin) {
      const { data: companies } = await supabaseAdmin
        .from("companies").select("id, name, active").order("name");
      const ids = (companies ?? []).map((c) => c.id);
      const [usersAgg, docsAgg] = await Promise.all([
        supabaseAdmin.from("profiles").select("company_id").in("company_id", ids),
        supabaseAdmin.from("knowledge_documents").select("company_id").in("company_id", ids),
      ]);
      const tally = (rows: Array<{ company_id: string | null }> | null) => {
        const m = new Map<string, number>();
        for (const r of rows ?? []) if (r.company_id) m.set(r.company_id, (m.get(r.company_id) || 0) + 1);
        return m;
      };
      const u = tally(usersAgg.data as never), d = tally(docsAgg.data as never);
      companyBreakdown = (companies ?? []).map((c) => ({
        id: c.id, name: c.name, active: !!c.active,
        users: u.get(c.id) || 0, docs: d.get(c.id) || 0,
        questions30d: perCompanyQuestions.get(c.id) || 0,
      })).sort((a, b) => b.questions30d - a.questions30d);
    }

    return {
      isPlatformAdmin,
      totalUsers: usersResp.count ?? 0,
      activeUsers: activeResp.count ?? 0,
      totalDocs: docsResp.count ?? 0,
      totalFaqs: faqsResp.count ?? 0,
      totalQuestions: qResp.count ?? 0,
      topDocs,
      topQuestions,
      companyBreakdown,
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
