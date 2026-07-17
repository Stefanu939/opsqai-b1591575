/**
 * Enterprise Support Center server functions.
 * Customer side: workspace_owner / admin / manager open + reply to conversations
 * scoped to their own company. Platform side: platform_owner / platform_admin
 * see/manage all conversations across all companies.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth.server";
import { z } from "zod";
import { getActorRoles, requirePermission } from "@/lib/authorization";

const AttachmentSchema = z.object({
  path: z.string(),
  name: z.string(),
  size: z.number(),
  mime: z.string(),
});

async function isPlatform(ctx: { supabase: any; userId: string }) {
  const a = await getActorRoles(ctx.supabase, ctx.userId);
  return a.isPlatformAdmin;
}

export const listSupportConversations = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        scope: z.enum(["mine", "platform"]).default("mine"),
        company_id: z.string().uuid().optional().nullable(),
        status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
        priority: z.enum(["low", "normal", "high", "critical"]).optional(),
        assigned_to: z.string().uuid().optional().nullable(),
        search: z.string().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, data.scope === "platform" ? "support.manage" : "support.use");
    let q = context.supabase
      .from("support_conversations")
      .select(
        "id, company_id, subject, status, priority, assigned_to, last_message_at, unread_for_customer, unread_for_platform, opened_by, created_at, companies(name)",
      )
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (data.scope === "platform" && data.company_id) q = q.eq("company_id", data.company_id);
    if (data.status) q = q.eq("status", data.status);
    if (data.priority) q = q.eq("priority", data.priority);
    if (data.assigned_to) q = q.eq("assigned_to", data.assigned_to);
    if (data.search) q = q.ilike("subject", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getSupportConversation = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "support.use");
    const [conv, msgs] = await Promise.all([
      context.supabase
        .from("support_conversations")
        .select(
          "id, company_id, subject, status, priority, assigned_to, opened_by, last_message_at, unread_for_customer, unread_for_platform, context, created_at, companies(name)",
        )
        .eq("id", data.id)
        .maybeSingle(),
      context.supabase
        .from("support_messages")
        .select(
          "id, conversation_id, sender_id, sender_kind, body, internal_note, attachments, created_at",
        )
        .eq("conversation_id", data.id)
        .order("created_at", { ascending: true }),
    ]);
    if (conv.error) throw new Error(conv.error.message);
    if (msgs.error) throw new Error(msgs.error.message);
    return { conversation: conv.data, messages: msgs.data ?? [] };
  });

export const createSupportConversation = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        subject: z.string().min(2).max(200),
        priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
        body: z.string().min(1).max(10000),
        attachments: z.array(AttachmentSchema).max(10).default([]),
        context: z.record(z.string(), z.any()).default({}),
        company_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "support.use");
    const platform = await isPlatform(context);
    let companyId = data.company_id ?? null;
    if (!platform || !companyId) {
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("company_id")
        .eq("id", context.userId)
        .maybeSingle();
      companyId = prof?.company_id ?? null;
    }
    if (!companyId) throw new Error("No company");
    const { data: conv, error } = await context.supabase
      .from("support_conversations")
      .insert({
        company_id: companyId,
        opened_by: context.userId,
        subject: data.subject,
        priority: data.priority,
        context: data.context,
      })
      .select("id, company_id, subject, status, priority, last_message_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    const { error: mErr } = await context.supabase.from("support_messages").insert({
      conversation_id: conv.id,
      sender_id: context.userId,
      sender_kind: platform ? "platform" : "customer",
      body: data.body,
      attachments: data.attachments,
      context: data.context,
    });
    if (mErr) throw new Error(mErr.message);
    return conv;
  });

export const postSupportMessage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        conversation_id: z.string().uuid(),
        body: z.string().min(1).max(10000),
        internal_note: z.boolean().default(false),
        attachments: z.array(AttachmentSchema).max(10).default([]),
        context: z.record(z.string(), z.any()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "support.use");
    const platform = await isPlatform(context);
    if (data.internal_note && !platform) throw new Error("Forbidden");
    const { error } = await context.supabase.from("support_messages").insert({
      conversation_id: data.conversation_id,
      sender_id: context.userId,
      sender_kind: platform ? "platform" : "customer",
      body: data.body,
      internal_note: platform ? data.internal_note : false,
      attachments: data.attachments,
      context: data.context,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markSupportRead = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const platform = await isPlatform(context);
    const patch = platform ? { unread_for_platform: 0 } : { unread_for_customer: 0 };
    const { error } = await context.supabase
      .from("support_conversations")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSupportConversation = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
        priority: z.enum(["low", "normal", "high", "critical"]).optional(),
        assigned_to: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "support.manage");
    const patch: { status?: string; priority?: string; assigned_to?: string | null } = {};
    if (data.status) patch.status = data.status;
    if (data.priority) patch.priority = data.priority;
    if (data.assigned_to !== undefined) patch.assigned_to = data.assigned_to;
    const { error } = await context.supabase
      .from("support_conversations")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createSupportAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        conversation_id: z.string().uuid(),
        filename: z.string().min(1).max(200),
        mime: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(context, "support.use");
    const { data: conv, error: cErr } = await context.supabase
      .from("support_conversations")
      .select("company_id")
      .eq("id", data.conversation_id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!conv) throw new Error("Not found");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
    const path = `${conv.company_id}/${data.conversation_id}/${crypto.randomUUID()}-${safe}`;
    const { data: signed, error } = await context.supabase.storage
      .from("support-attachments")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const getSupportAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePermission(context, "support.use");
    const { data: signed, error } = await context.supabase.storage
      .from("support-attachments")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const getSupportUnreadCount = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const platform = await isPlatform(context);
    const column = platform ? "unread_for_platform" : "unread_for_customer";
    const { data, error } = await context.supabase
      .from("support_conversations")
      .select(`${column}`)
      .gt(column, 0);
    if (error) return { count: 0, conversations: 0 };
    const rows = (data ?? []) as Array<Record<string, number>>;
    const total = rows.reduce((s, r) => s + (r[column] ?? 0), 0);
    return { count: total, conversations: rows.length };
  });
