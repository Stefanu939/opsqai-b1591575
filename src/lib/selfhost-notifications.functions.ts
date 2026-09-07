// Authenticated access to the Self-Hosted notification inbox.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { uuidString } from "@/lib/zod-uuid";
import { getProfileRepository } from "@/lib/providers/registry";

type Ctx = { supabase: unknown; userId: string };

async function scope(context: Ctx): Promise<{ companyId: string; userId: string } | null> {
  const profile = await getProfileRepository(context.supabase).findByUserId(context.userId);
  const companyId = profile?.companyId ?? null;
  if (!companyId) return null;
  return { companyId, userId: context.userId };
}

export const listLocalNotificationsFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const mod = await import("@/lib/selfhost-notifications.server");
    if (!mod.localInboxAvailable()) return { available: false as const, items: [] };
    const s = await scope(context as Ctx);
    if (!s) return { available: true as const, items: [] };
    return {
      available: true as const,
      items: await mod.listLocalNotifications(s.companyId, s.userId),
    };
  });

export const markLocalNotificationReadFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const mod = await import("@/lib/selfhost-notifications.server");
    if (!mod.localInboxAvailable()) return { ok: false };
    const s = await scope(context as Ctx);
    if (!s) return { ok: false };
    await mod.markLocalNotificationRead(data.id, s.userId, s.companyId);
    return { ok: true };
  });

export const markAllLocalNotificationsReadFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const mod = await import("@/lib/selfhost-notifications.server");
    if (!mod.localInboxAvailable()) return { ok: false };
    const s = await scope(context as Ctx);
    if (!s) return { ok: false };
    await mod.markAllLocalNotificationsRead(s.companyId, s.userId);
    return { ok: true };
  });
