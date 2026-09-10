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

/** Human label for a requester: full name, else name parts, else e-mail local part. */
function personLabel(
  profile: { firstName?: string | null; lastName?: string | null; fullName?: string | null; email?: string | null } | null,
  fallbackEmail?: string | null,
): string {
  const parts = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
  const full = (profile?.fullName ?? "").trim();
  const email = profile?.email ?? fallbackEmail ?? null;
  return full || parts || (email ? email.split("@")[0]! : "Colleague");
}

async function profileOf(context: Ctx, userId: string) {
  try {
    return await getProfileRepository(context.supabase).findByUserId(userId);
  } catch {
    return null;
  }
}

/** Attach requester identity so approvers see who asked for the days off. */
async function withRequesters(
  context: Ctx,
  rows: TimeOffRecord[],
): Promise<TimeOffRecord[]> {
  const ids = [...new Set(rows.map((r) => r.userId))];
  const profiles = new Map<string, Awaited<ReturnType<typeof profileOf>>>();
  await Promise.all(
    ids.map(async (id) => {
      profiles.set(id, await profileOf(context, id));
    }),
  );
  return rows.map((r) => {
    const p = profiles.get(r.userId) ?? null;
    return {
      ...r,
      requesterName: personLabel(p),
      requesterEmail: p?.email ?? null,
      requesterDepartment: p?.department ?? null,
    };
  });
}

/** User ids allowed to approve time off (roles + platform staff). */
async function approverIds(context: Ctx, exclude: string): Promise<string[]> {
  try {
    const { getRoleRepository } = await import("@/lib/providers/registry");
    const rows = await getRoleRepository(context.supabase).listAssignmentsDetailed();
    const ids = rows
      .filter(
        (r) =>
          r.isPlatformOwner ||
          APPROVER_ROLES.has(r.role) ||
          r.role === "platform_admin" ||
          r.role === "platform_owner",
      )
      .map((r) => r.userId);
    return [...new Set(ids)].filter((id) => id !== exclude);
  } catch {
    return [];
  }
}

/** Fire-and-forget notification; a failed notice must never fail the request. */
async function notify(
  context: Ctx,
  input: { userIds: string[]; kind: string; title: string; body: string },
): Promise<void> {
  if (input.userIds.length === 0) return;
  const company = await companyOf(context);
  try {
    if (isSelfHosted()) {
      const { emitLocalNotification, localInboxAvailable } = await import(
        "@/lib/selfhost-notifications.server"
      );
      if (!localInboxAvailable() || !company) return;
      await Promise.all(
        input.userIds.map((userId) =>
          emitLocalNotification({
            companyId: company,
            userId,
            kind: input.kind,
            category: "people",
            title: input.title,
            body: input.body,
            link: "/app/calendar",
          }),
        ),
      );
      return;
    }
    if (!company) return;
    const { getCloudSupabaseAdmin } = await import("@/lib/providers/not-available");
    const admin = await getCloudSupabaseAdmin("time-off");
    await admin.rpc("notify_emit", {
      _company: company,
      _user_ids: input.userIds,
      _kind: input.kind,
      _category: "people",
      _title: input.title,
      _body: input.body,
      _link: "/calendar",
    });
  } catch {
    /* notifications are best-effort */
  }
}

function periodLabel(req: { startsOn: string; endsOn: string }): string {
  return `${req.startsOn} → ${req.endsOn}`;
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
      pending = await withRequesters(
        ctx,
        all.filter((r) => r.status === "pending" && r.userId !== ctx.userId),
      );
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
    const me = personLabel(await profileOf(ctx, ctx.userId), ctx.claims?.email ?? null);
    if (a.autoApprove) {
      const eventId = await createCalendarEvent(ctx, req, me);
      req = await repo.updateTimeOff(req.id, {
        approvedBy: ctx.userId,
        approvedAt: new Date().toISOString(),
        calendarEventId: eventId,
      });
    } else {
      await notify(ctx, {
        userIds: await approverIds(ctx, ctx.userId),
        kind: "time_off_requested",
        title: `${me} requested time off`,
        body: `${periodLabel(req)}${req.reason ? ` · ${req.reason}` : ""}`,
      });
    }
    return { ...req, requesterName: me };
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
    const who = personLabel(await profileOf(ctx, existing.userId));
    if (data.decision === "rejected") {
      await removeCalendarEvent(ctx, existing);
      const updated = await repo.updateTimeOff(data.id, {
        status: "rejected",
        approvedBy: ctx.userId,
        approvedAt: new Date().toISOString(),
        calendarEventId: null,
      });
      await notify(ctx, {
        userIds: [existing.userId],
        kind: "time_off_rejected",
        title: "Time off declined",
        body: periodLabel(existing),
      });
      return { ...updated, requesterName: who };
    }
    const eventId = await createCalendarEvent(ctx, existing, who);
    const updated = await repo.updateTimeOff(data.id, {
      status: "approved",
      approvedBy: ctx.userId,
      approvedAt: new Date().toISOString(),
      calendarEventId: eventId,
    });
    await notify(ctx, {
      userIds: [existing.userId],
      kind: "time_off_approved",
      title: "Time off approved",
      body: periodLabel(existing),
    });
    return { ...updated, requesterName: who };
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
