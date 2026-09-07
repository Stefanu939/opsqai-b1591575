// CRM for the Management Center (cloud only — OPSQAI staff).
//
// Visibility model: every platform staff member sees all leads; only the
// lead owner (or a platform owner / SuperAdmin) may edit, move or delete.
// Reads run through the service-role client, so the ownership rule is
// enforced here in application code as well as in RLS.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { getActorRoles, requirePlatformAdmin } from "@/lib/authorization";
import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { uuidString } from "@/lib/zod-uuid";

export const CRM_STAGES = [
  "new",
  "qualified",
  "demo",
  "pilot",
  "offer",
  "won",
  "lost",
] as const;
export type CrmStage = (typeof CRM_STAGES)[number];

export const CRM_ACTIVITY_KINDS = ["note", "call", "email", "meeting", "task"] as const;

export type CrmLead = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  language: string | null;
  source: string;
  source_ref: string | null;
  stage: string;
  status: string;
  value_amount: number | null;
  currency: string;
  probability: number | null;
  products: string[];
  notes: string | null;
  owner_user_id: string | null;
  company_id: string | null;
  lost_reason: string | null;
  next_action_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

export type CrmActivity = {
  id: string;
  lead_id: string;
  kind: string;
  subject: string | null;
  body: string | null;
  due_at: string | null;
  done_at: string | null;
  owner_user_id: string | null;
  created_at: string;
};

export type CrmEvent = {
  id: string;
  lead_id: string;
  kind: string;
  detail: string | null;
  created_at: string;
};

export type CrmOffer = {
  id: string;
  lead_id: string;
  title: string;
  products: string[];
  amount: number | null;
  currency: string;
  status: string;
  valid_until: string | null;
  created_at: string;
};

type Ctx = { supabase: unknown; userId: string };

async function staff(context: Ctx) {
  await requirePlatformAdmin(context as never);
  const roles = await getActorRoles((context as { supabase: unknown }).supabase, context.userId);
  return {
    userId: context.userId,
    isSuperAdmin: roles.isPlatformOwner || roles.roles.includes("superadmin"),
  };
}

async function assertCanEdit(context: Ctx, leadId: string) {
  const actor = await staff(context);
  const admin = await getCloudSupabaseAdmin("crm");
  const { data: lead, error } = await admin
    .from("crm_leads")
    .select("id, owner_user_id, company_name, stage, company_id")
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!lead) throw new Error("Lead not found");
  if (!actor.isSuperAdmin && lead.owner_user_id && lead.owner_user_id !== actor.userId) {
    throw new Error("Forbidden: this lead belongs to another colleague");
  }
  return { actor, admin, lead };
}

async function logEvent(
  admin: Awaited<ReturnType<typeof getCloudSupabaseAdmin>>,
  leadId: string,
  kind: string,
  detail: string,
  actorUserId: string,
) {
  await admin
    .from("crm_lead_events")
    .insert({ lead_id: leadId, kind, detail, actor_user_id: actorUserId });
}

/**
 * CRM changes are audited on the lead's own timeline (`crm_lead_events`),
 * which is the record staff actually read. `audit_log` is company-scoped
 * and mandatory-question shaped, so it is not a fit for pre-customer leads.
 */
async function audit(
  admin: Awaited<ReturnType<typeof getCloudSupabaseAdmin>>,
  userId: string,
  action: string,
  resource: string,
  payload: Record<string, unknown>,
) {
  await admin.from("crm_lead_events").insert({
    lead_id: resource,
    kind: "audit",
    detail: `${action} ${JSON.stringify(payload)}`.slice(0, 500),
    actor_user_id: userId,
  });
}

// ── Reads ─────────────────────────────────────────────────────────────

export const listCrmLeads = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const actor = await staff(context as never);
    const admin = await getCloudSupabaseAdmin("crm");

    const [{ data: leads, error }, { data: acts }, staffRows] = await Promise.all([
      admin.from("crm_leads").select("*").order("updated_at", { ascending: false }).limit(1000),
      admin
        .from("crm_activities")
        .select("id, lead_id, kind, subject, due_at, done_at, owner_user_id")
        .is("done_at", null)
        .order("due_at", { ascending: true })
        .limit(1000),
      admin
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["platform_admin", "platform_owner"]),
    ]);
    if (error) throw new Error(error.message);

    const staffIds = [...new Set((staffRows.data ?? []).map((r) => r.user_id as string))];
    const { data: profiles } = staffIds.length
      ? await admin.from("profiles").select("id, full_name, first_name").in("id", staffIds)
      : { data: [] as Array<Record<string, unknown>> };
    const nameById = new Map(
      (profiles ?? []).map((p) => [
        p['id'] as string,
        (p['full_name'] as string) || (p['first_name'] as string) || "OPSQAI",
      ]),
    );

    return {
      leads: (leads ?? []) as CrmLead[],
      openActivities: (acts ?? []) as CrmActivity[],
      staff: staffIds.map((id) => ({ user_id: id, name: nameById.get(id) ?? "OPSQAI" })),
      me: actor.userId,
      isSuperAdmin: actor.isSuperAdmin,
    };
  });

export const getCrmLead = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await staff(context as never);
    const admin = await getCloudSupabaseAdmin("crm");
    const [{ data: lead, error }, { data: acts }, { data: events }, { data: offers }] =
      await Promise.all([
        admin.from("crm_leads").select("*").eq("id", data.id).maybeSingle(),
        admin
          .from("crm_activities")
          .select("*")
          .eq("lead_id", data.id)
          .order("created_at", { ascending: false }),
        admin
          .from("crm_lead_events")
          .select("*")
          .eq("lead_id", data.id)
          .order("created_at", { ascending: false })
          .limit(200),
        admin
          .from("crm_offers")
          .select("*")
          .eq("lead_id", data.id)
          .order("created_at", { ascending: false }),
      ]);
    if (error) throw new Error(error.message);
    if (!lead) throw new Error("Lead not found");
    const l = lead as CrmLead;
    return {
      lead: l,
      activities: (acts ?? []) as CrmActivity[],
      events: (events ?? []) as CrmEvent[],
      offers: (offers ?? []) as CrmOffer[],
      canEdit: actor.isSuperAdmin || !l.owner_user_id || l.owner_user_id === actor.userId,
      me: actor.userId,
      isSuperAdmin: actor.isSuperAdmin,
    };
  });

// ── Writes ────────────────────────────────────────────────────────────

const LeadInput = z.object({
  id: uuidString().optional(),
  company_name: z.string().min(1).max(160),
  contact_name: z.string().max(160).nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  phone: z.string().max(60).nullish(),
  country: z.string().max(60).nullish(),
  language: z.enum(["en", "de", "ro"]).default("en"),
  source: z.string().max(60).default("manual"),
  stage: z.enum(CRM_STAGES).default("new"),
  value_amount: z.number().min(0).max(100_000_000).nullish(),
  currency: z.string().min(1).max(8).default("EUR"),
  probability: z.number().int().min(0).max(100).nullish(),
  products: z.array(z.string().max(64)).max(32).default([]),
  notes: z.string().max(8000).nullish(),
  next_action_at: z.string().nullish(),
  lost_reason: z.string().max(400).nullish(),
});

export const saveCrmLead = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => LeadInput.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await staff(context as never);
    const admin = await getCloudSupabaseAdmin("crm");
    const values = {
      company_name: data.company_name,
      contact_name: data.contact_name ?? null,
      email: data.email ? data.email : null,
      phone: data.phone ?? null,
      country: data.country ?? null,
      language: data.language,
      source: data.source,
      stage: data.stage,
      status: data.stage === "won" ? "won" : data.stage === "lost" ? "lost" : "open",
      value_amount: data.value_amount ?? null,
      currency: data.currency,
      probability: data.probability ?? null,
      products: data.products,
      notes: data.notes ?? null,
      next_action_at: data.next_action_at ?? null,
      lost_reason: data.lost_reason ?? null,
      last_activity_at: new Date().toISOString(),
    };

    if (data.id) {
      await assertCanEdit(context as never, data.id);
      const { error } = await admin.from("crm_leads").update(values).eq("id", data.id);
      if (error) throw new Error(error.message);
      await logEvent(admin, data.id, "updated", data.company_name, actor.userId);
      await audit(admin, actor.userId, "crm.lead.update", data.id, { stage: data.stage });
      return { id: data.id };
    }

    const { data: row, error } = await admin
      .from("crm_leads")
      .insert({ ...values, owner_user_id: actor.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logEvent(admin, row.id as string, "created", "Manual", actor.userId);
    await audit(admin, actor.userId, "crm.lead.create", row.id as string, {
      company: data.company_name,
    });
    return { id: row.id as string };
  });

export const moveCrmLeadStage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuidString(),
        stage: z.enum(CRM_STAGES),
        lost_reason: z.string().max(400).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { actor, admin, lead } = await assertCanEdit(context as never, data.id);
    const { error } = await admin
      .from("crm_leads")
      .update({
        stage: data.stage,
        status: data.stage === "won" ? "won" : data.stage === "lost" ? "lost" : "open",
        lost_reason: data.stage === "lost" ? (data.lost_reason ?? null) : null,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logEvent(
      admin,
      data.id,
      "stage_changed",
      `${lead.stage} → ${data.stage}`,
      actor.userId,
    );
    await audit(admin, actor.userId, "crm.lead.stage", data.id, {
      from: lead.stage,
      to: data.stage,
    });
    return { ok: true };
  });

export const assignCrmLead = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: uuidString(), owner_user_id: uuidString().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { actor, admin } = await assertCanEdit(context as never, data.id);
    const { error } = await admin
      .from("crm_leads")
      .update({ owner_user_id: data.owner_user_id })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logEvent(admin, data.id, "assigned", data.owner_user_id ?? "unassigned", actor.userId);
    await audit(admin, actor.userId, "crm.lead.assign", data.id, {
      owner: data.owner_user_id,
    });
    return { ok: true };
  });

export const deleteCrmLead = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    const { actor, admin } = await assertCanEdit(context as never, data.id);
    const { error } = await admin.from("crm_leads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(admin, actor.userId, "crm.lead.delete", data.id, {});
    return { ok: true };
  });

// ── Activities ────────────────────────────────────────────────────────

export const saveCrmActivity = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        lead_id: uuidString(),
        kind: z.enum(CRM_ACTIVITY_KINDS),
        subject: z.string().max(200).nullish(),
        body: z.string().max(8000).nullish(),
        due_at: z.string().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { actor, admin } = await assertCanEdit(context as never, data.lead_id);
    const values = {
      lead_id: data.lead_id,
      kind: data.kind,
      subject: data.subject ?? null,
      body: data.body ?? null,
      due_at: data.due_at ?? null,
    };
    if (data.id) {
      const { error } = await admin.from("crm_activities").update(values).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin
        .from("crm_activities")
        .insert({ ...values, owner_user_id: actor.userId });
      if (error) throw new Error(error.message);
    }
    await admin
      .from("crm_leads")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", data.lead_id);
    await logEvent(admin, data.lead_id, "activity", `${data.kind}: ${data.subject ?? ""}`, actor.userId);
    return { ok: true };
  });

export const completeCrmActivity = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: uuidString(), done: z.boolean().default(true) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await staff(context as never);
    const admin = await getCloudSupabaseAdmin("crm");
    const { data: act } = await admin
      .from("crm_activities")
      .select("id, lead_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!act) throw new Error("Activity not found");
    await assertCanEdit(context as never, act.lead_id as string);
    const { error } = await admin
      .from("crm_activities")
      .update({ done_at: data.done ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logEvent(admin, act.lead_id as string, "activity_done", data.id, actor.userId);
    return { ok: true };
  });

export const deleteCrmActivity = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await staff(context as never);
    const admin = await getCloudSupabaseAdmin("crm");
    const { data: act } = await admin
      .from("crm_activities")
      .select("id, lead_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!act) return { ok: true };
    await assertCanEdit(context as never, act.lead_id as string);
    const { error } = await admin.from("crm_activities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Every open activity across the pipeline, for the Activities screen. */
export const listCrmActivities = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const actor = await staff(context as never);
    const admin = await getCloudSupabaseAdmin("crm");
    const { data, error } = await admin
      .from("crm_activities")
      .select("*, crm_leads(id, company_name, stage, owner_user_id)")
      .order("due_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return { rows: data ?? [], me: actor.userId, isSuperAdmin: actor.isSuperAdmin };
  });

// ── Offers ────────────────────────────────────────────────────────────

export const saveCrmOffer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuidString().optional(),
        lead_id: uuidString(),
        title: z.string().min(1).max(200),
        products: z.array(z.string().max(64)).max(32).default([]),
        amount: z.number().min(0).max(100_000_000).nullish(),
        currency: z.string().min(1).max(8).default("EUR"),
        status: z.enum(["draft", "sent", "accepted", "declined"]).default("draft"),
        valid_until: z.string().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { actor, admin } = await assertCanEdit(context as never, data.lead_id);
    const values = {
      lead_id: data.lead_id,
      title: data.title,
      products: data.products,
      amount: data.amount ?? null,
      currency: data.currency,
      status: data.status,
      valid_until: data.valid_until ? data.valid_until.slice(0, 10) : null,
    };
    if (data.id) {
      const { error } = await admin.from("crm_offers").update(values).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin
        .from("crm_offers")
        .insert({ ...values, owner_user_id: actor.userId });
      if (error) throw new Error(error.message);
    }
    await logEvent(admin, data.lead_id, "offer", `${data.title} (${data.status})`, actor.userId);
    return { ok: true };
  });

export const renderCrmOfferPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await staff(context as never);
    const admin = await getCloudSupabaseAdmin("crm");
    const { data: offer } = await admin
      .from("crm_offers")
      .select("*, crm_leads(company_name, contact_name, country)")
      .eq("id", data.id)
      .maybeSingle();
    if (!offer) throw new Error("Offer not found");
    const lead = (offer as Record<string, unknown>)['crm_leads'] as Record<string, unknown> | null;
    const { renderTablePdf } = await import("@/lib/transport/table-pdf.server");
    const bytes = await renderTablePdf({
      title: `OPSQAI — ${offer.title as string}`,
      subtitle: `${(lead?.['company_name'] as string) ?? ""} · ${(lead?.['contact_name'] as string) ?? ""}`,
      headers: ["Item", "Detail"],
      rows: [
        ["Customer", (lead?.['company_name'] as string) ?? "—"],
        ["Contact", (lead?.['contact_name'] as string) ?? "—"],
        ["Country", (lead?.['country'] as string) ?? "—"],
        ["Products", ((offer.products as string[]) ?? []).join(", ") || "—"],
        [
          "Amount",
          offer.amount != null ? `${offer.amount} ${offer.currency as string}` : "—",
        ],
        ["Status", offer.status as string],
        ["Valid until", (offer.valid_until as string) ?? "—"],
      ],
      generatedLabel: `Generated ${new Date().toLocaleDateString()}`,
    });
    return {
      filename: `opsqai-offer-${(offer.id as string).slice(0, 8)}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  });

// ── Convert to customer ───────────────────────────────────────────────

export const convertCrmLeadToCustomer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuidString(),
        /** Link to an existing customer instead of creating a new one. */
        company_id: uuidString().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { actor, admin, lead } = await assertCanEdit(context as never, data.id);

    let companyId = data.company_id ?? null;
    if (!companyId) {
      const { data: existing } = await admin
        .from("companies")
        .select("id")
        .ilike("name", lead.company_name as string)
        .maybeSingle();
      if (existing) companyId = existing.id as string;
    }

    if (!companyId) {
      return {
        ok: false as const,
        needsCustomer: true as const,
        company_name: lead.company_name as string,
      };
    }

    const { error } = await admin
      .from("crm_leads")
      .update({
        company_id: companyId,
        stage: "won",
        status: "won",
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const { data: company } = await admin
      .from("companies")
      .select("id, name, install_id, enabled_products")
      .eq("id", companyId)
      .maybeSingle();

    await logEvent(admin, data.id, "converted", (company?.name as string) ?? companyId, actor.userId);
    await audit(admin, actor.userId, "crm.lead.convert", data.id, { company_id: companyId });

    return {
      ok: true as const,
      needsCustomer: false as const,
      company_id: companyId,
      company_name: (company?.name as string) ?? lead.company_name,
      install_id: (company?.install_id as string) ?? null,
    };
  });

// ── Reports ───────────────────────────────────────────────────────────

export const crmReports = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await staff(context as never);
    const admin = await getCloudSupabaseAdmin("crm");
    const { data: leads, error } = await admin
      .from("crm_leads")
      .select(
        "id, stage, status, source, country, language, value_amount, currency, owner_user_id, created_at, last_activity_at",
      )
      .limit(2000);
    if (error) throw new Error(error.message);
    const rows = leads ?? [];

    const byKey = (key: (r: (typeof rows)[number]) => string) => {
      const map = new Map<string, { count: number; value: number }>();
      for (const r of rows) {
        const k = key(r) || "—";
        const cur = map.get(k) ?? { count: 0, value: 0 };
        cur.count += 1;
        cur.value += Number(r.value_amount ?? 0);
        map.set(k, cur);
      }
      return [...map.entries()]
        .map(([label, v]) => ({ label, ...v }))
        .sort((a, b) => b.count - a.count);
    };

    const won = rows.filter((r) => r.stage === "won").length;
    const lost = rows.filter((r) => r.stage === "lost").length;
    const stale = rows.filter(
      (r) =>
        !["won", "lost"].includes(r.stage as string) &&
        Date.now() - new Date(r.last_activity_at as string).getTime() > 14 * 86_400_000,
    );

    return {
      total: rows.length,
      won,
      lost,
      conversion: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0,
      openValue: rows
        .filter((r) => !["won", "lost"].includes(r.stage as string))
        .reduce((s, r) => s + Number(r.value_amount ?? 0), 0),
      wonValue: rows
        .filter((r) => r.stage === "won")
        .reduce((s, r) => s + Number(r.value_amount ?? 0), 0),
      byStage: byKey((r) => r.stage as string),
      bySource: byKey((r) => r.source as string),
      byCountry: byKey((r) => (r.country as string) ?? "—"),
      byLanguage: byKey((r) => (r.language as string) ?? "—"),
      byOwner: byKey((r) => (r.owner_user_id as string) ?? "unassigned"),
      staleCount: stale.length,
    };
  });

export const exportCrmReportPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await staff(context as never);
    const admin = await getCloudSupabaseAdmin("crm");
    const { data: leads } = await admin
      .from("crm_leads")
      .select("company_name, stage, source, country, value_amount, currency, last_activity_at")
      .order("stage", { ascending: true })
      .limit(500);
    const { renderTablePdf } = await import("@/lib/transport/table-pdf.server");
    const bytes = await renderTablePdf({
      title: "OPSQAI CRM — Pipeline report",
      subtitle: `${(leads ?? []).length} leads`,
      headers: ["Customer", "Stage", "Source", "Country", "Value", "Last activity"],
      rows: (leads ?? []).map((l) => [
        l.company_name as string,
        l.stage as string,
        l.source as string,
        (l.country as string) ?? "—",
        l.value_amount != null ? `${l.value_amount} ${l.currency as string}` : "—",
        new Date(l.last_activity_at as string).toLocaleDateString(),
      ]),
      generatedLabel: `Generated ${new Date().toLocaleString()}`,
    });
    return {
      filename: `opsqai-crm-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  });
