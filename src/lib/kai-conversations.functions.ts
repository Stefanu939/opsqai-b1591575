// Kai conversation memory — stored per account in the cloud so it follows the
// user across devices (laptop ↔ phone / Car Mode). RLS limits rows to owner.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";

const ConvSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().max(300),
  pinned: z.boolean(),
  updatedAt: z.number(),
  messages: z.array(z.unknown()).max(400),
});

export const listKaiConversations = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { data, error } = await context.supabase
      .from("kai_conversations")
      .select("id, title, pinned, messages, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      pinned: r.pinned,
      updatedAt: new Date(r.updated_at).getTime(),
      messages: JSON.stringify(r.messages ?? []),
    }));
  });

export const saveKaiConversations = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ upsert: z.array(ConvSchema).max(50), remove: z.array(z.string()).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    if (data.upsert.length) {
      const { error } = await context.supabase.from("kai_conversations").upsert(
        data.upsert.map((c) => ({
          id: c.id,
          user_id: context.userId,
          title: c.title,
          pinned: c.pinned,
          messages: c.messages as never,
          updated_at: new Date(c.updatedAt).toISOString(),
        })),
        { onConflict: "user_id,id" },
      );
      if (error) throw new Error(error.message);
    }
    if (data.remove.length) {
      const { error } = await context.supabase
        .from("kai_conversations")
        .delete()
        .eq("user_id", context.userId)
        .in("id", data.remove);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
