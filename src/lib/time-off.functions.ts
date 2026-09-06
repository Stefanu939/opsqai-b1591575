// Holidays / time-off server functions — Cloud + Self-Hosted.
//
// Approved requests are mirrored into the existing calendar so the period
// shows up automatically; rejection/cancellation removes that event again.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { uuidString } from "@/lib/zod-uuid";
import { isSelfHosted } from "@/lib/platform";
import { getPresenceRepository, getProfileRepository } from "@/lib/providers/registry";
import type { TimeOffRecord } from "@/lib/providers/interfaces";

type Ctx = { supabase: unknown; userId: string; claims?: { email?: string } };

const APPROVER_ROLES = new Set(["admin", "manager", "superadmin", "workspace_owner"]);
const AUTO_APPROVE_ROLES = new Set(["superadmin"]);

async function actor(context: Ctx) {
  const { getActorRoles } = await import("@/lib/authorization");
  const roles = await getActorRoles(context.supabase, context.userId);
  const canApprove =
    roles.isPlatformAdmin || roles.roles.some((r) => APPROVER_ROLES.has(r));
  const autoApprove =
    roles.isPlatformOwner ||
    roles.isPlatformAdmin ||
    roles.roles.some((r) => AUTO_APPROVE_ROLES.has(r));
  return { ...roles, canApprove, autoApprove };
}

async function companyOf(context: Ctx): Promise<string | null> {
  try {
    const profile = await getProfileRepository(context.supabase).findByUserId(
      context.userId,
    );
    return profile?.companyId ?? null;
  } catch {
    return null;
  }
}

function label(req: TimeOffRecord, who: string): string {
  return `Time off — ${who}`;
}

/** Create the linked calendar entry for an approved request. */
async function createCalendarEvent(
  context: Ctx,
  req: TimeOffRecord,
  who: string,
): Promise<string | null> {
  const day = (value: string, endOfDay: boolean): string | null => {
    const iso = /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
    if (!iso) {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      return endOfDay
        ? new Date(`${parsed.toISOString().slice(0, 10)}T23:59:59.000Z`).toISOString()
        : new Date(`${parsed.toISOString().slice(0, 10)}T00:00:00.000Z`).toISOString();
    }
    return new Date(`${iso}T${endOfDay ? "23:59:59" : "00:00:00"}.000Z`).toISOString();
  };
  const startsAt = day(req.startsOn, false);
  const endsAt = day(req.endsOn, true);
  if (!startsAt || !endsAt) return null;

  try {
    if (isSelfHosted()) {

      const { getCalendarRepository } = await import("@/lib/providers/registry");
      const repo = getCalendarRepository(context.supabase);
      const res = await repo.upsertEvent({
        ownerUserId: req.userId,
        title: label(req, who),
        description: req.reason,
        kind: "other",
        location: null,
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: true,
      });
      return res.id;
    }
    const { getCloudSupabaseAdmin } = await import("@/lib/providers/not-available");
    const core = await import("@/lib/calendar-core.server");
    // Write into the calendar the person actually uses: OPSQAI staff see the
    // fleet ("platform") calendar, customer contacts the portal calendar.
    const resolved = await core.resolveScope(context as never);
    const admin = await getCloudSupabaseAdmin("time-off");
    const { data, error } = await admin
      .from("calendar_events")
      .insert({
        scope: resolved.scope,
        owner_email: resolved.scope === "portal" ? context.claims?.email ?? null : null,
        title: label(req, who),
        description: req.reason,
        kind: "other",
        location: null,
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: true,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id as string;
  } catch {
    return null;
  }
}

async function removeCalendarEvent(context: Ctx, req: TimeOffRecord) {
  if (!req.calendarEventId) return;
  try {
    if (isSelfHosted()) {
      const { getCalendarRepository } = await import("@/lib/providers/registry");
      await getCalendarRepository(context.supabase).deleteEvent(
        req.userId,
        req.calendarEventId,
      );
      return;
    }
    const { getCloudSupabaseAdmin } = await import("@/lib/providers/not-available");
    const admin = await getCloudSupabaseAdmin("time-off");
    await admin.from("calendar_events").delete().eq("id", req.calendarEventId);
  } catch {
    /* calendar entry already gone — request state still updates */
  }
}

export const listMyTimeOff = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    const repo = getPresenceRepository(ctx.supabase);
    const a = await actor(ctx);
    const mine = await repo.listMyTimeOff(ctx.userId);
    let pending: TimeOffRecord[] = [];
    if (a.canApprove) {
      const company = await companyOf(ctx);
      const all = await repo.listCompanyTimeOff(company);
      pending = all.filter((r) => r.status === "pending" && r.userId !== ctx.userId);
    }
    return { mine, pending, canApprove: a.canApprove, autoApprove: a.autoApprove };
  });

export const requestTimeOff = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().trim().max(500).nullable().optional(),
      })
      .refine((v) => v.endsOn >= v.startsOn, { message: "End date must not be before start date" })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const repo = getPresenceRepository(ctx.supabase);
    const a = await actor(ctx);
    const company = await companyOf(ctx);
    let req = await repo.createTimeOff({
      userId: ctx.userId,
      companyId: company,
      startsOn: data.startsOn,
      endsOn: data.endsOn,
      reason: data.reason?.length ? data.reason : null,
      status: a.autoApprove ? "approved" : "pending",
    });
    if (a.autoApprove) {
      const eventId = await createCalendarEvent(
        ctx,
        req,
        ctx.claims?.email ?? "team member",
      );
      req = await repo.updateTimeOff(req.id, {
        approvedBy: ctx.userId,
        approvedAt: new Date().toISOString(),
        calendarEventId: eventId,
      });
    }
    return req;
  });

export const decideTimeOff = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: uuidString(), decision: z.enum(["approved", "rejected"]) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const a = await actor(ctx);
    if (!a.canApprove) throw new Error("Forbidden: you cannot approve time off");
    const repo = getPresenceRepository(ctx.supabase);
    const existing = await repo.getTimeOff(data.id);
    if (!existing) throw new Error("Request not found");
    if (data.decision === "rejected") {
      await removeCalendarEvent(ctx, existing);
      return repo.updateTimeOff(data.id, {
        status: "rejected",
        approvedBy: ctx.userId,
        approvedAt: new Date().toISOString(),
        calendarEventId: null,
      });
    }
    const eventId = await createCalendarEvent(ctx, existing, "team member");
    return repo.updateTimeOff(data.id, {
      status: "approved",
      approvedBy: ctx.userId,
      approvedAt: new Date().toISOString(),
      calendarEventId: eventId,
    });
  });

export const cancelTimeOff = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    const repo = getPresenceRepository(ctx.supabase);
    const existing = await repo.getTimeOff(data.id);
    if (!existing) throw new Error("Request not found");
    const a = await actor(ctx);
    if (existing.userId !== ctx.userId && !a.canApprove) {
      throw new Error("Forbidden");
    }
    await removeCalendarEvent(ctx, existing);
    return repo.updateTimeOff(data.id, { status: "cancelled", calendarEventId: null });
  });
