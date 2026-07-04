import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { requirePlatformAdmin, getProfileCompany, getActorRoles } from "@/lib/authorization";

const STATUS = z.enum(["trial", "active", "grace_period", "suspended", "cancelled"]);
const ActorKind = z.enum(["system", "platform_admin", "company_admin"]);

async function requireCompanyOrPlatform(context: any, companyId: string) {
  const actor = await getActorRoles(context.supabase, context.userId);
  if (actor.isPlatformAdmin) return { isPlatformAdmin: true, companyId };
  const own = await getProfileCompany(context.supabase, context.userId);
  if (!own || own !== companyId) throw new Error("Forbidden");
  return { isPlatformAdmin: false, companyId };
}

async function logEvent(
  context: any,
  args: {
    company_id: string;
    event_type: string;
    from_status?: string | null;
    to_status?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
    actor_kind?: "system" | "platform_admin" | "company_admin";
  },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("subscription_events").insert({
    company_id: args.company_id,
    event_type: args.event_type,
    from_status: args.from_status ?? null,
    to_status: args.to_status ?? null,
    reason: args.reason ?? null,
    actor_id: context.userId,
    actor_kind: args.actor_kind ?? "platform_admin",
    metadata: (args.metadata ?? {}) as any,
  });
}

async function notify(companyId: string, kind: string, title: string, body: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("subscription_notify_admins", {
    _company: companyId,
    _kind: kind,
    _title: title,
    _body: body,
  });
}

/** Read the current lifecycle state for a company. */
export const getSubscriptionState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireCompanyOrPlatform(context, data.company_id);
    const { data: row, error } = await context.supabase
      .rpc("get_subscription_state", { _company: data.company_id })
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/** List all companies' subscription state (platform admin only). */
export const listWorkspaceLifecycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select(
        "id, name, subscription_status, subscription_plan, trial_ends_at, renewal_date, grace_period_days, grace_period_ends_at, suspended_at, cancelled_at, suspension_reason, billing_override, last_payment_at, next_invoice_due_at, internal_notes, created_at",
      )
      .order("subscription_status", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { companies: data ?? [] };
  });

export const listSubscriptionEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid(), limit: z.number().int().min(1).max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireCompanyOrPlatform(context, data.company_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("subscription_events")
      .select("id, event_type, from_status, to_status, reason, actor_id, actor_kind, metadata, created_at")
      .eq("company_id", data.company_id)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    return { events: rows ?? [] };
  });

/** Change status (activate / suspend / cancel-suspension / cancel / trial / grace). */
export const changeSubscriptionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: z.string().uuid(),
        to_status: STATUS,
        reason: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin
      .from("companies")
      .select("subscription_status, name")
      .eq("id", data.company_id)
      .maybeSingle();
    const { error } = await supabaseAdmin.rpc("subscription_apply_status", {
      _company: data.company_id,
      _to_status: data.to_status,
      _reason: data.reason ?? undefined,
      _actor_kind: "platform_admin",
    });
    if (error) throw new Error(error.message);
    // Notifications for the visible transitions.
    if (data.to_status === "suspended")
      await notify(data.company_id, "workspace_suspended", "Workspace suspended", data.reason ?? "Suspended by administrator");
    if (data.to_status === "active")
      await notify(data.company_id, "workspace_reactivated", "Workspace reactivated", "Full access restored.");
    if (data.to_status === "grace_period")
      await notify(data.company_id, "billing_grace_started", "Grace period started", data.reason ?? "Grace period started by administrator");
    if (data.to_status === "cancelled")
      await notify(data.company_id, "workspace_cancelled", "Subscription cancelled", data.reason ?? "Subscription cancelled by administrator");
    return { ok: true, from: cur?.subscription_status ?? null, to: data.to_status };
  });

/** Adjust the grace period end date (extend or shorten). */
export const adjustGracePeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: z.string().uuid(),
        ends_at: z.string().datetime().nullable().optional(),
        add_days: z.number().int().min(-90).max(90).optional(),
        reason: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin
      .from("companies")
      .select("grace_period_ends_at, subscription_status")
      .eq("id", data.company_id)
      .maybeSingle();
    if (!cur) throw new Error("Company not found");

    let newEnds: string | null = cur.grace_period_ends_at;
    if (data.ends_at !== undefined) {
      newEnds = data.ends_at;
    } else if (data.add_days) {
      const base = cur.grace_period_ends_at ? new Date(cur.grace_period_ends_at) : new Date();
      base.setUTCDate(base.getUTCDate() + data.add_days);
      newEnds = base.toISOString();
    }

    const patch: Record<string, unknown> = { grace_period_ends_at: newEnds };
    if (cur.subscription_status !== "grace_period" && newEnds) patch.subscription_status = "grace_period";
    const { error } = await supabaseAdmin.from("companies").update(patch).eq("id", data.company_id);
    if (error) throw new Error(error.message);

    await logEvent(context, {
      company_id: data.company_id,
      event_type: (data.add_days ?? 0) < 0 ? "grace_shortened" : "grace_extended",
      reason: data.reason,
      metadata: { ends_at: newEnds, add_days: data.add_days ?? null },
    });
    return { ok: true, grace_period_ends_at: newEnds };
  });

/** Update renewal date. */
export const updateRenewalDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: z.string().uuid(),
        renewal_date: z.string().datetime().nullable(),
        next_invoice_due_at: z.string().datetime().nullable().optional(),
        reason: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { renewal_date: data.renewal_date };
    if (data.next_invoice_due_at !== undefined) patch.next_invoice_due_at = data.next_invoice_due_at;
    const { error } = await supabaseAdmin.from("companies").update(patch).eq("id", data.company_id);
    if (error) throw new Error(error.message);
    await logEvent(context, {
      company_id: data.company_id,
      event_type: "renewal_updated",
      reason: data.reason,
      metadata: { renewal_date: data.renewal_date, next_invoice_due_at: data.next_invoice_due_at ?? null },
    });
    return { ok: true };
  });

/** Set/unset the billing override (bypass all suspensions). */
export const setBillingOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid(), enabled: z.boolean(), reason: z.string().max(500).optional().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("companies")
      .update({ billing_override: data.enabled })
      .eq("id", data.company_id);
    if (error) throw new Error(error.message);
    await logEvent(context, {
      company_id: data.company_id,
      event_type: data.enabled ? "billing_override_enabled" : "billing_override_disabled",
      reason: data.reason,
    });
    return { ok: true };
  });

/** Attach or replace the internal admin note. */
export const setInternalNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid(), notes: z.string().max(5000).nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("companies")
      .update({ internal_notes: data.notes })
      .eq("id", data.company_id);
    if (error) throw new Error(error.message);
    await logEvent(context, {
      company_id: data.company_id,
      event_type: "internal_note_updated",
      metadata: { length: (data.notes ?? "").length },
    });
    return { ok: true };
  });

/** Record a successful payment (also triggers automatic reactivation on next tick). */
export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: z.string().uuid(),
        paid_at: z.string().datetime().optional().nullable(),
        reactivate: z.boolean().default(true),
        reason: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const paidAt = data.paid_at ?? new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("companies")
      .update({ last_payment_at: paidAt })
      .eq("id", data.company_id);
    if (error) throw new Error(error.message);
    await logEvent(context, {
      company_id: data.company_id,
      event_type: "payment_recorded",
      reason: data.reason,
      metadata: { paid_at: paidAt },
    });
    if (data.reactivate) {
      const { data: cur } = await supabaseAdmin
        .from("companies")
        .select("subscription_status")
        .eq("id", data.company_id)
        .maybeSingle();
      if (cur && ["suspended", "grace_period"].includes(cur.subscription_status)) {
        await supabaseAdmin.rpc("subscription_apply_status", {
          _company: data.company_id,
          _to_status: "active",
          _reason: "Payment received",
          _actor_kind: "platform_admin",
        });
        await notify(data.company_id, "workspace_reactivated", "Workspace reactivated", "Payment received. Full access restored.");
      }
    }
    return { ok: true, paid_at: paidAt };
  });

/** Run the automation tick immediately. */
export const runLifecycleTick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("subscription_lifecycle_tick");
    if (error) throw new Error(error.message);
    return data as Record<string, number | string>;
  });

/** Configure grace period length. */
export const setGracePeriodDays = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid(), days: z.number().int().min(0).max(90) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("companies")
      .update({ grace_period_days: data.days })
      .eq("id", data.company_id);
    if (error) throw new Error(error.message);
    await logEvent(context, {
      company_id: data.company_id,
      event_type: "grace_period_days_updated",
      metadata: { days: data.days },
    });
    return { ok: true };
  });

export type SubscriptionStatus = z.infer<typeof STATUS>;
export type SubscriptionActorKind = z.infer<typeof ActorKind>;
