import { getCloudSupabase , getCloudSupabaseAdmin} from "@/lib/providers/not-available";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { requireAnyPermission } from "@/lib/authorization";

const RoleListSchema = z.object({});
void RoleListSchema;

const UUID_LIKE_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function normalizeOptionalUuid(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return UUID_LIKE_RE.test(trimmed) ? trimmed : undefined;
}

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
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.enum(["open", "in_review", "answered", "closed", "all"]).optional(),
        mine: z.boolean().optional(),
        companyId: z.preprocess(normalizeOptionalUuid, z.string().optional()),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = getCloudSupabase(context, "internal-requests")
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
    const userIds = Array.from(
      new Set(
        (rows ?? []).flatMap((r: any) => [r.user_id, r.answered_by].filter(Boolean) as string[]),
      ),
    );
    let profMap = new Map<string, { name: string | null; email?: string }>();
    if (userIds.length) {
      const { data: profs } = await getCloudSupabase(context, "internal-requests")
        .from("profiles")
        .select("id, full_name, first_name, last_name")
        .in("id", userIds);
      for (const p of profs ?? []) {
        const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || null;
        profMap.set(p.id, { name });
      }
    }
    let deptMap = new Map<string, string>();
    const deptIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.department_id).filter(Boolean) as string[]),
    );
    if (deptIds.length) {
      const { data: depts } = await getCloudSupabase(context, "internal-requests")
        .from("departments")
        .select("id, name")
        .in("id", deptIds);
      for (const d of depts ?? []) deptMap.set(d.id, d.name);
    }
    return (rows ?? []).map((r: any) => ({
      ...r,
      author_name: profMap.get(r.user_id)?.name ?? null,
      answered_by_name: r.answered_by ? (profMap.get(r.answered_by)?.name ?? null) : null,
      department_name: r.department_id ? (deptMap.get(r.department_id) ?? null) : null,
    }));
  });

export const createInternalRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        question: z.string().trim().min(3).max(2000),
        thread_id: z.string().uuid().optional().nullable(),
        context: z.string().max(4000).optional().nullable(),
        priority: z.enum(["low", "normal", "high"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await getCloudSupabase(context, "internal-requests")
      .from("profiles")
      .select("company_id, department_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.company_id) throw new Error("No company assigned");
    const { data: row, error } = await getCloudSupabase(context, "internal-requests")
      .from("internal_requests")
      .insert({
        company_id: profile.company_id,
        user_id: context.userId,
        thread_id: data.thread_id ?? null,
        department_id: profile.department_id ?? null,
        question: data.question,
        context: data.context ?? null,
        priority: data.priority ?? "normal",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    try {
      const supabaseAdmin = await getCloudSupabaseAdmin("internal-requests");
      const { data: requesterAuth } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      const requesterEmail = requesterAuth?.user?.email;
      const { data: requesterProfile } = await supabaseAdmin
        .from("profiles")
        .select("first_name, full_name")
        .eq("id", context.userId)
        .maybeSingle();
      if (requesterEmail) {
        const { dispatchTransactionalEmail } = await import("@/lib/email/dispatch.server");
        await dispatchTransactionalEmail({
          templateName: "request-created",
          recipientEmail: requesterEmail,
          templateData: {
            firstName:
              (requesterProfile as { first_name?: string; full_name?: string } | null)
                ?.first_name ?? (requesterProfile as { full_name?: string } | null)?.full_name,
            question: data.question,
            referenceId: `IRQ-${String(row.id).slice(0, 8).toUpperCase()}`,
            requestUrl: "https://opsqai.de/app/knowledge",
          },
        });
      }
    } catch (e) {
      console.error("[internal-requests.create] confirmation email failed", (e as Error).message);
    }

    return { ok: true, id: row.id };
  });

export const updateInternalRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "in_review", "answered", "closed"]).optional(),
        priority: z.enum(["low", "normal", "high"]).optional(),
        answer: z.string().max(8000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // SECURITY: only staff (admin/manager/team_leader/platform_admin) may
    // answer a request or mark it as "answered"/"in_review". Regular
    // employees can only close their own request.
    const staff = await isStaff(getCloudSupabase(context, "internal-requests"), context.userId);

    // Fetch the row so we can verify ownership and enforce role-scoped writes.
    const { data: existing, error: fetchErr } = await getCloudSupabase(context, "internal-requests")
      .from("internal_requests")
      .select("user_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!existing) throw new Error("Request not found");
    const isOwner = existing.user_id === context.userId;

    const patch: {
      status?: "open" | "in_review" | "answered" | "closed";
      priority?: "low" | "normal" | "high";
      answer?: string | null;
      answered_by?: string | null;
      answered_at?: string | null;
    } = {};

    if (data.answer !== undefined) {
      if (!staff.isStaff) throw new Error("Forbidden: staff role required to answer requests");
      patch.answer = data.answer;
      patch.answered_by = context.userId;
      patch.answered_at = new Date().toISOString();
      if (!data.status) patch.status = "answered";
    }

    if (data.status !== undefined) {
      const staffOnlyStatuses = new Set(["answered", "in_review", "open"]);
      if (staffOnlyStatuses.has(data.status) && !staff.isStaff) {
        // Non-staff (including the request owner) may only close their own request.
        if (!(data.status === "closed" && isOwner)) {
          throw new Error("Forbidden: only staff can set that status");
        }
      }
      // "closed" is allowed for staff on any row, and for the owner of the row.
      if (data.status === "closed" && !staff.isStaff && !isOwner) {
        throw new Error("Forbidden");
      }
      patch.status = data.status;
    }

    if (data.priority !== undefined) {
      if (!staff.isStaff) throw new Error("Forbidden: only staff can change priority");
      patch.priority = data.priority;
    }

    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await getCloudSupabase(context, "internal-requests")
      .from("internal_requests")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const promoteRequestToFaq = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        question_en: z.string().min(1).max(500),
        question_de: z.string().min(1).max(500),
        answer_en: z.string().min(1).max(4000),
        answer_de: z.string().min(1).max(4000),
        category: z.string().min(1).max(80),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["faq.create", "faq.edit", "knowledge.manage"]);
    const { data: req } = await getCloudSupabase(context, "internal-requests")
      .from("internal_requests")
      .select("company_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!req) throw new Error("Request not found");
    const { data: faq, error: faqErr } = await getCloudSupabase(context, "internal-requests")
      .from("faqs")
      .insert({
        company_id: req.company_id,
        question_en: data.question_en,
        question_de: data.question_de,
        answer_en: data.answer_en,
        answer_de: data.answer_de,
        category: data.category,
      })
      .select("id")
      .single();
    if (faqErr) throw new Error(faqErr.message);
    await getCloudSupabase(context, "internal-requests")
      .from("internal_requests")
      .update({
        status: "answered",
        promoted_to_faq_id: faq.id,
        answered_by: context.userId,
        answered_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    return { ok: true, faq_id: faq.id };
  });

export const promoteRequestToKb = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(3).max(200),
        category: z.string().trim().min(1).max(80),
        doc_code: z.string().trim().max(80).optional().nullable(),
        source_owner: z.string().trim().min(1).max(120),
        content: z.string().trim().min(20).max(50000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "sop.create", "sop.publish"]);
    const { data: req } = await getCloudSupabase(context, "internal-requests")
      .from("internal_requests")
      .select("company_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!req) throw new Error("Request not found");

    const headerLine = `[Owner: ${data.source_owner}]`;
    const fullText = `${headerLine}\n\n${data.content}`;

    const { data: doc, error: docErr } = await getCloudSupabase(context, "internal-requests")
      .from("knowledge_documents")
      .insert({
        company_id: req.company_id,
        title: data.title,
        category: data.category,
        doc_code: data.doc_code || null,
        content_text: fullText,
        status: "ready",
        uploaded_by: context.userId,
      })
      .select("id")
      .single();
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
        await getCloudSupabase(context, "internal-requests").from("document_chunks").insert(rows);
        await getCloudSupabase(context, "internal-requests")
          .from("knowledge_documents")
          .update({ chunk_count: chunks.length })
          .eq("id", doc.id);
      }
    } catch (e) {
      console.error("KB index failed", e);
    }

    await getCloudSupabase(context, "internal-requests")
      .from("internal_requests")
      .update({
        status: "answered",
        promoted_to_kb_id: doc.id,
        answered_by: context.userId,
        answered_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    return { ok: true, document_id: doc.id };
  });

export const countOpenRequests = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const staff = await isStaff(getCloudSupabase(context, "internal-requests"), context.userId);
    if (!staff.isStaff) return { count: 0 };
    const { count } = await getCloudSupabase(context, "internal-requests")
      .from("internal_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");
    return { count: count ?? 0 };
  });
