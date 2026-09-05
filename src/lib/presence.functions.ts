// Presence (Set status) server functions — Cloud + Self-Hosted.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { uuidString } from "@/lib/zod-uuid";
import { getPresenceRepository } from "@/lib/providers/registry";
import type { PresenceRecord } from "@/lib/providers/interfaces";

const STATUS = ["available", "busy", "away", "dnd"] as const;

/** Presence expires on its own: past `until` everyone is Available again. */
function normalize(rec: PresenceRecord | null, userId: string): PresenceRecord {
  if (!rec) return { userId, status: "available", message: null, until: null };
  if (rec.until && new Date(rec.until).getTime() <= Date.now()) {
    return { userId: rec.userId, status: "available", message: null, until: null };
  }
  return rec;
}

export const getMyPresence = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const ctx = context as { supabase: unknown; userId: string };
    const repo = getPresenceRepository(ctx.supabase);
    return normalize(await repo.getPresence(ctx.userId), ctx.userId);
  });

export const setMyPresence = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.enum(STATUS),
        message: z.string().trim().max(140).nullable().optional(),
        until: z.string().datetime().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as { supabase: unknown; userId: string };
    const repo = getPresenceRepository(ctx.supabase);
    const rec = await repo.setPresence(ctx.userId, {
      status: data.status,
      message: data.message?.length ? data.message : null,
      until: data.until ?? null,
    });
    return normalize(rec, ctx.userId);
  });

export const listPresence = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ userIds: z.array(uuidString()).max(200) }).parse(d ?? { userIds: [] }),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as { supabase: unknown; userId: string };
    if (data.userIds.length === 0) return { entries: [] as PresenceRecord[] };
    const repo = getPresenceRepository(ctx.supabase);
    const rows = await repo.listPresence(data.userIds);
    return { entries: rows.map((r) => normalize(r, r.userId)) };
  });
