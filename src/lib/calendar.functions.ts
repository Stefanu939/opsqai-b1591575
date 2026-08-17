// Calendar server functions (Cloud: Management Center + Customer Portal).
//
// Thin wrappers only — all runtime logic lives in `calendar-core.server.ts`
// so server-fn splitting cannot strip a module-scope sibling.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { uuidString } from "@/lib/zod-uuid";

const KINDS = ["meeting", "renewal", "maintenance", "release", "deadline", "training", "other"] as const;

export const listCalendar = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
        scope: z.enum(["platform", "portal"]).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const core = await import("@/lib/calendar-core.server");
    const resolved = await core.resolveScope(context as never);
    const scope =
      data.scope === "portal" || resolved.scope === "portal" ? "portal" : resolved.scope;
    const now = Date.now();
    const events = await core.buildCalendar({
      scope,
      email: resolved.email,
      from: data.from ? new Date(data.from) : new Date(now - 90 * 86400000),
      to: data.to ? new Date(data.to) : new Date(now + 365 * 86400000),
    });
    return { scope, events };
  });

export const upsertCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).nullable().optional(),
        kind: z.enum(KINDS).default("meeting"),
        location: z.string().trim().max(200).nullable().optional(),
        starts_at: z.string(),
        ends_at: z.string().nullable().optional(),
        all_day: z.boolean().default(false),
        scope: z.enum(["platform", "portal"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const core = await import("@/lib/calendar-core.server");
    const { getCloudSupabaseAdmin } = await import("@/lib/providers/not-available");
    const resolved = await core.resolveScope(context as never);
    const scope =
      data.scope === "portal" || resolved.scope === "portal" ? "portal" : resolved.scope;
    const admin = await getCloudSupabaseAdmin("calendar");
    const row = {
      scope,
      owner_email: scope === "portal" ? resolved.email : null,
      title: data.title,
      description: data.description ?? null,
      kind: data.kind,
      location: data.location ?? null,
      starts_at: new Date(data.starts_at).toISOString(),
      ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : null,
      all_day: data.all_day,
      created_by: (context as { userId: string }).userId,
    };
    if (data.id) {
      let q = admin.from("calendar_events").update(row).eq("id", data.id).eq("scope", scope);
      if (scope === "portal") q = q.eq("owner_email", resolved.email ?? "__none__");
      const { error } = await q;
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: created, error } = await admin
      .from("calendar_events")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: created.id };
  });

export const deleteCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    const core = await import("@/lib/calendar-core.server");
    const { getCloudSupabaseAdmin } = await import("@/lib/providers/not-available");
    const resolved = await core.resolveScope(context as never);
    const admin = await getCloudSupabaseAdmin("calendar");
    let q = admin.from("calendar_events").delete().eq("id", data.id).eq("scope", resolved.scope);
    if (resolved.scope === "portal") q = q.eq("owner_email", resolved.email ?? "__none__");
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCalendarFeed = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ rotate: z.boolean().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const core = await import("@/lib/calendar-core.server");
    const resolved = await core.resolveScope(context as never);
    const ctx = context as { userId: string };
    const token = data.rotate
      ? await core.rotateFeedToken({ userId: ctx.userId, ...resolved })
      : await core.getOrCreateFeedToken({ userId: ctx.userId, ...resolved });
    return { token, scope: resolved.scope };
  });
