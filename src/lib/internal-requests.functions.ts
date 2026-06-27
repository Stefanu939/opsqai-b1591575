import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { requireAnyPermission } from "@/lib/authorization";

const RoleListSchema = z.object({});
void RoleListSchema;

async function isStaff(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role as string);
  return {
    isPlatform: roles.includes("platform_admin") || roles.includes("platform_owner"),
    isAdmin: roles.includes("admin"),
    isManager: roles.includes("manager"),
    isTeamLeader: roles.includes("team_leader"),
    isStaff:
      roles.includes("platform_admin") ||
      roles.includes("platform_owner") ||
      roles.includes("admin") ||
      roles.includes("manager") ||
      roles.includes("team_leader"),
  };
}

export const listInternalRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    status: z.enum(["open", "in_review", "answered", "closed", "all"]).optional(),
    mine: z.boolean().optional(),
    companyId: z.string().uuid().optional(),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("internal_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.mine) q = q.eq("user_id", context.userId);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.companyId) q = q.eq("company_id", data.companyId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // Enrich with creator name/email + answerer name
    const userIds = Array.from(new Set((rows ?? []).flatMap((r: any) =>
      [r.user_id, r.answered_by].filter(Boolean) as string[]
    )));
    let profMap = new Map<string, { name: string | null; email?: string }>();
    if (userIds.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name")
        .in("id", userIds);
      for (const p of profs ?? []) {
        const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || null;
        profMap.set(p.id, { name });
      }
    }
    let deptMap = new Map<string, string>();
    const deptIds = Array.from(new Set((rows ?? []).map((r: any) => r.department_id).filter(Boolean) as string[]));
    if (deptIds.length) {
      const { data: depts } = await context.supabase.from("departments").select("id, name").in("id", deptIds);
      for (const d of depts ?? []) deptMap.set(d.id, d.name);
    }
    return (rows ?? []).map((r: any) => ({
      ...r,
      author_name: profMap.get(r.user_id)?.name ?? null,
      answered_by_name: r.answered_by ? profMap.get(r.answered_by)?.name ?? null : null,
      department_name: r.department_id ? deptMap.get(r.department_id) ?? null : null,
    }));
  });

export const createInternalRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    question: z.string().trim().min(3).max(2000),
    thread_id: z.string().uuid().optional().nullable(),
    context: z.string().max(4000).optional().nullable(),
    priority: z.enum(["low", "normal", "high"]).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("company_id, department_id").eq("id", context.userId).maybeSingle();
    if (!profile?.company_id) throw new Error("No company assigned");
    const { data: row, error } = await context.supabase.from("internal_requests").insert({
      company_id: profile.company_id,
      user_id: context.userId,
      thread_id: data.thread_id ?? null,
      department_id: profile.department_id ?? null,
      question: data.question,
      context: data.context ?? null,
      priority: data.priority ?? "normal",
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const updateInternalRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["open", "in_review", "answered", "closed"]).optional(),
    priority: z.enum(["low", "normal", "high"]).optional(),
    answer: z.string().max(8000).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: {
      status?: "open" | "in_review" | "answered" | "closed";
      priority?: "low" | "normal" | "high";
      answer?: string | null;
      answered_by?: string | null;
      answered_at?: string | null;
    } = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.answer !== undefined) {
      patch.answer = data.answer;
      patch.answered_by = context.userId;
      patch.answered_at = new Date().toISOString();
      if (!data.status) patch.status = "answered";
    }
    const { error } = await context.supabase.from("internal_requests").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const promoteRequestToFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    question_en: z.string().min(1).max(500),
    question_de: z.string().min(1).max(500),
    answer_en: z.string().min(1).max(4000),
    answer_de: z.string().min(1).max(4000),
    category: z.string().min(1).max(80),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["faq.create", "faq.edit", "knowledge.manage"]);
    const { data: req } = await context.supabase
      .from("internal_requests").select("company_id").eq("id", data.id).maybeSingle();
    if (!req) throw new Error("Request not found");
    const { data: faq, error: faqErr } = await context.supabase.from("faqs").insert({
      company_id: req.company_id,
      question_en: data.question_en,
      question_de: data.question_de,
      answer_en: data.answer_en,
      answer_de: data.answer_de,
      category: data.category,
    }).select("id").single();
    if (faqErr) throw new Error(faqErr.message);
    await context.supabase.from("internal_requests").update({
      status: "answered",
      promoted_to_faq_id: faq.id,
      answered_by: context.userId,
      answered_at: new Date().toISOString(),
    }).eq("id", data.id);
    return { ok: true, faq_id: faq.id };
  });

export const promoteRequestToKb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    title: z.string().trim().min(3).max(200),
    category: z.string().trim().min(1).max(80),
    doc_code: z.string().trim().max(80).optional().nullable(),
    source_owner: z.string().trim().min(1).max(120),
    content: z.string().trim().min(20).max(50000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "sop.create", "sop.publish"]);
    const { data: req } = await context.supabase
      .from("internal_requests").select("company_id").eq("id", data.id).maybeSingle();
    if (!req) throw new Error("Request not found");

    const headerLine = `[Owner: ${data.source_owner}]`;
    const fullText = `${headerLine}\n\n${data.content}`;

    const { data: doc, error: docErr } = await context.supabase.from("knowledge_documents").insert({
      company_id: req.company_id,
      title: data.title,
      category: data.category,
      doc_code: data.doc_code || null,
      content_text: fullText,
      status: "ready",
      uploaded_by: context.userId,
    }).select("id").single();
    if (docErr) throw new Error(docErr.message);

    // Index content (embed chunks)
    try {
      const { chunkText } = await import("@/lib/doc-processing.server");
      const { embedTexts } = await import("@/lib/embeddings.server");
      const chunks = chunkText(fullText);
      if (chunks.length) {
        const vectors = await embedTexts(chunks);
        const rows = chunks.map((content, i) => ({
          document_id: doc.id,
          company_id: req.company_id,
          chunk_index: i,
          content,
          embedding: `[${vectors[i].join(",")}]` as unknown as never,
        }));
        await context.supabase.from("document_chunks").insert(rows);
        await context.supabase.from("knowledge_documents")
          .update({ chunk_count: chunks.length }).eq("id", doc.id);
      }
    } catch (e) {
      console.error("KB index failed", e);
    }

    await context.supabase.from("internal_requests").update({
      status: "answered",
      promoted_to_kb_id: doc.id,
      answered_by: context.userId,
      answered_at: new Date().toISOString(),
    }).eq("id", data.id);
    return { ok: true, document_id: doc.id };
  });

export const countOpenRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const staff = await isStaff(context.supabase, context.userId);
    if (!staff.isStaff) return { count: 0 };
    const { count } = await context.supabase
      .from("internal_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");
    return { count: count ?? 0 };
  });
