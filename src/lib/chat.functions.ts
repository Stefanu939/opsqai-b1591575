// Chat DM server functions — 1:1 conversations between colleagues + OPSQAI staff.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth.server";

export type ChatContact = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_staff: boolean;
  is_colleague: boolean;
};

export type ChatConversation = {
  id: string;
  created_at: string;
  last_message_at: string;
  peer: ChatContact | null;
  last_message: {
    body: string | null;
    created_at: string;
    sender_id: string;
    has_attachments: boolean;
  } | null;
  unread_count: number;
};

export type ChatAttachment = {
  path: string;
  name: string;
  mime: string;
  size: number;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachments: ChatAttachment[];
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

const uuid = z.string().uuid();

// ---------------- Contacts ----------------

export const searchChatContacts = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ q: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<ChatContact[]> => {
    const { data: rows, error } = await context.supabase.rpc(
      "search_chat_contacts",
      { _q: data.q, _limit: 15 } as never,
    );
    if (error) throw new Error(error.message);
    return (rows ?? []) as ChatContact[];
  });

// ---------------- Conversations ----------------

export const listMyConversations = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<ChatConversation[]> => {
    const me = context.userId;

    // Conversations I'm a member of.
    const { data: myMemberships, error: mErr } = await context.supabase
      .from("direct_conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", me);
    if (mErr) throw new Error(mErr.message);
    const convIds = (myMemberships ?? []).map((m) => m.conversation_id);
    if (convIds.length === 0) return [];

    const readMap = new Map<string, string>(
      (myMemberships ?? []).map((m) => [m.conversation_id, m.last_read_at]),
    );

    const { data: convs, error: cErr } = await context.supabase
      .from("direct_conversations")
      .select("id, created_at, last_message_at")
      .in("id", convIds)
      .order("last_message_at", { ascending: false });
    if (cErr) throw new Error(cErr.message);

    // Peer memberships (all rows for these convs, then filter self out).
    const { data: allMembers, error: amErr } = await context.supabase
      .from("direct_conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds);
    if (amErr) throw new Error(amErr.message);

    const peerByConv = new Map<string, string>();
    for (const row of allMembers ?? []) {
      if (row.user_id !== me) peerByConv.set(row.conversation_id, row.user_id);
    }

    const peerIds = Array.from(new Set(peerByConv.values()));
    const peerProfiles = new Map<
      string,
      { full_name: string; email: string; avatar_url: string | null }
    >();
    if (peerIds.length > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name, avatar_url")
        .in("id", peerIds);
      // Emails come from contact search RPC on demand; for peer display we
      // fall back to the name only (email isn't stored on profiles).
      for (const p of (profs ?? []) as Array<{
        id: string;
        full_name: string | null;
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
      }>) {
        const name =
          p.full_name ||
          [p.first_name, p.last_name].filter(Boolean).join(" ") ||
          "";
        peerProfiles.set(p.id, {
          full_name: name,
          email: "",
          avatar_url: p.avatar_url ?? null,
        });
      }
    }

    const { data: staffRoles } = peerIds.length
      ? await context.supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", peerIds)
          .in("role", ["platform_owner", "platform_admin"])
      : { data: [] as { user_id: string; role: string }[] };
    const staffSet = new Set((staffRoles ?? []).map((r) => r.user_id));

    // Last message per conversation.
    const { data: lastMsgs } = await context.supabase
      .from("direct_messages")
      .select("id, conversation_id, sender_id, body, attachments, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    const lastByConv = new Map<
      string,
      { body: string | null; created_at: string; sender_id: string; has_attachments: boolean }
    >();
    for (const m of lastMsgs ?? []) {
      if (!lastByConv.has(m.conversation_id)) {
        const atts = Array.isArray(m.attachments) ? (m.attachments as unknown[]) : [];
        lastByConv.set(m.conversation_id, {
          body: m.body,
          created_at: m.created_at,
          sender_id: m.sender_id,
          has_attachments: atts.length > 0,
        });
      }
    }

    // Unread counts (messages after last_read_at not from me).
    const unreadByConv = new Map<string, number>();
    for (const m of lastMsgs ?? []) {
      if (m.sender_id === me) continue;
      const lastRead = readMap.get(m.conversation_id) ?? "1970-01-01T00:00:00Z";
      if (new Date(m.created_at).getTime() > new Date(lastRead).getTime()) {
        unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
      }
    }

    return (convs ?? []).map((c) => {
      const peerId = peerByConv.get(c.id) ?? "";
      const profile = peerProfiles.get(peerId);
      const peer: ChatContact | null = peerId
        ? {
            id: peerId,
            full_name: profile?.full_name ?? "",
            email: profile?.email ?? "",
            avatar_url: profile?.avatar_url ?? null,
            is_staff: staffSet.has(peerId),
            is_colleague: !staffSet.has(peerId),
          }
        : null;
      return {
        id: c.id,
        created_at: c.created_at,
        last_message_at: c.last_message_at,
        peer,
        last_message: lastByConv.get(c.id) ?? null,
        unread_count: unreadByConv.get(c.id) ?? 0,
      };
    });
  });

export const startDirectConversation = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ target_user_id: uuid }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ conversation_id: string }> => {
    const { data: convId, error } = await context.supabase.rpc(
      "find_or_create_direct_conversation",
      { _target: data.target_user_id } as never,
    );
    if (error) throw new Error(error.message);
    return { conversation_id: convId as string };
  });

// ---------------- Messages ----------------

export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        conversation_id: uuid,
        before: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<ChatMessage[]> => {
    let q = context.supabase
      .from("direct_messages")
      .select("id, conversation_id, sender_id, body, attachments, created_at, edited_at, deleted_at")
      .eq("conversation_id", data.conversation_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.before) q = q.lt("created_at", data.before);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return ((rows ?? []) as ChatMessage[]).reverse();
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        conversation_id: uuid,
        body: z.string().trim().max(4000).optional(),
        attachments: z
          .array(
            z.object({
              path: z.string().min(1).max(400),
              name: z.string().min(1).max(200),
              mime: z.string().min(1).max(200),
              size: z.number().int().min(0).max(25 * 1024 * 1024),
            }),
          )
          .max(10)
          .default([]),
      })
      .refine((v) => (v.body && v.body.length > 0) || v.attachments.length > 0, {
        message: "empty_message",
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<ChatMessage> => {
    const { data: row, error } = await context.supabase
      .from("direct_messages")
      .insert({
        conversation_id: data.conversation_id,
        sender_id: context.userId,
        body: data.body ?? null,
        attachments: data.attachments,
      })
      .select("id, conversation_id, sender_id, body, attachments, created_at, edited_at, deleted_at")
      .single();
    if (error) throw new Error(error.message);
    return row as ChatMessage;
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ conversation_id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("direct_conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversation_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Attachments ----------------

export const signChatAttachment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ path: z.string().min(1).max(400) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    // Verify caller is member of conversation encoded in path
    const convId = data.path.split("/")[0];
    if (!/^[0-9a-f-]{36}$/i.test(convId)) throw new Error("Invalid path");
    const { data: membership, error: mErr } = await context.supabase
      .from("direct_conversation_members")
      .select("id")
      .eq("conversation_id", convId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!membership) throw new Error("Forbidden");

    const { data: signed, error } = await context.supabase.storage
      .from("chat-attachments")
      .createSignedUrl(data.path, 3600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const createChatUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        conversation_id: uuid,
        filename: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(
    async ({ data, context }): Promise<{ path: string; token: string }> => {
      const { data: membership, error: mErr } = await context.supabase
        .from("direct_conversation_members")
        .select("id")
        .eq("conversation_id", data.conversation_id)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (mErr) throw new Error(mErr.message);
      if (!membership) throw new Error("Forbidden");

      const safe = data.filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
      const path = `${data.conversation_id}/${crypto.randomUUID()}-${safe}`;

      const { data: signed, error } = await context.supabase.storage
        .from("chat-attachments")
        .createSignedUploadUrl(path);
      if (error) throw new Error(error.message);
      return { path, token: signed.token };
    },
  );
