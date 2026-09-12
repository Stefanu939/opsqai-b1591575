// OPSQAI Value Engine — Management Center server functions (cloud only, staff).
//
// Visibility mirrors the CRM: every platform staff member reads all models,
// only the owner (or a platform owner / SuperAdmin) may change or delete one.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { getActorRoles, requirePlatformAdmin } from "@/lib/authorization";
import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { uuidString } from "@/lib/zod-uuid";
import {
  VALUE_DRIVERS,
  computeValue,
  type DriverInput,
  type ValueInputs,
} from "@/lib/value-engine";

export type ValueModelRow = {
  id: string;
  lead_id: string | null;
  company_name: string;
  level: number;
  currency: string;
  inputs: ValueInputs;
  drivers: DriverInput[];
  assumptions: string | null;
  computed: Record<string, number | string | boolean | null>;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
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

const driverSchema = z.object({
  key: z.enum(VALUE_DRIVERS),
  currentCost: z.number().min(0).max(1_000_000_000),
  impactPct: z.number().min(0).max(100),
});

const inputsSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  currency: z.string().trim().min(3).max(3),
  quick: z.object({
    employees: z.number().min(0).max(1_000_000),
    hourlyCost: z.number().min(0).max(100_000),
    minutesPerDay: z.number().min(0).max(1440),
    workingDays: z.number().min(0).max(366),
    improvementPct: z.number().min(0).max(100),
  }),
  drivers: z.array(driverSchema).max(20),
  investment: z.number().min(0).max(1_000_000_000),
  likelihoodPct: z.number().min(0).max(100),
  timeToValueMonths: z.number().min(0).max(60),
  effort: z.enum(["low", "medium", "high"]),
});

export const listValueModels = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const actor = await staff(context as never);
    const admin = await getCloudSupabaseAdmin("value-engine");
    const { data, error } = await admin
      .from("crm_value_models")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return {
      models: (data ?? []) as unknown as ValueModelRow[],
      me: actor.userId,
      isSuperAdmin: actor.isSuperAdmin,
    };
  });

export const getValueModel = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await staff(context as never);
    const admin = await getCloudSupabaseAdmin("value-engine");
    const { data: row, error } = await admin
      .from("crm_value_models")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Value model not found");
    const canEdit =
      actor.isSuperAdmin ||
      !row.owner_user_id ||
      (row.owner_user_id as string) === actor.userId;
    return { model: row as unknown as ValueModelRow, canEdit, me: actor.userId };
  });

export const saveValueModel = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuidString().nullish(),
        lead_id: uuidString().nullish(),
        company_name: z.string().trim().min(1).max(200),
        assumptions: z.string().trim().max(4000).nullish(),
        inputs: inputsSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const actor = await staff(context as never);
    const admin = await getCloudSupabaseAdmin("value-engine");
    const computed = computeValue(data.inputs as ValueInputs);

    const payload = {
      lead_id: data.lead_id ?? null,
      company_name: data.company_name,
      level: data.inputs.level,
      currency: data.inputs.currency,
      inputs: data.inputs,
      drivers: data.inputs.drivers,
      assumptions: data.assumptions ?? null,
      computed: computed as unknown as Record<string, never>,
    };

    if (data.id) {
      const { data: existing } = await admin
        .from("crm_value_models")
        .select("id, owner_user_id, lead_id")
        .eq("id", data.id)
        .maybeSingle();
      if (!existing) throw new Error("Value model not found");
      if (
        !actor.isSuperAdmin &&
        existing.owner_user_id &&
        (existing.owner_user_id as string) !== actor.userId
      ) {
        throw new Error("Forbidden: this calculation belongs to another colleague");
      }
      const { error } = await admin
        .from("crm_value_models")
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      if (payload.lead_id) {
        await admin.from("crm_lead_events").insert({
          lead_id: payload.lead_id,
          kind: "value",
          detail: `Value model updated (expected ${computed.expectedValue} ${computed.currency}/yr)`,
          actor_user_id: actor.userId,
        });
      }
      return { id: data.id, computed };
    }

    const { data: created, error } = await admin
      .from("crm_value_models")
      .insert({ ...payload, owner_user_id: actor.userId } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (payload.lead_id) {
      await admin.from("crm_lead_events").insert({
        lead_id: payload.lead_id,
        kind: "value",
        detail: `Value model created (expected ${computed.expectedValue} ${computed.currency}/yr)`,
        actor_user_id: actor.userId,
      });
    }
    return { id: created.id as string, computed };
  });

export const deleteValueModel = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await staff(context as never);
    const admin = await getCloudSupabaseAdmin("value-engine");
    const { data: existing } = await admin
      .from("crm_value_models")
      .select("id, owner_user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing) return { ok: true };
    if (
      !actor.isSuperAdmin &&
      existing.owner_user_id &&
      (existing.owner_user_id as string) !== actor.userId
    ) {
      throw new Error("Forbidden: this calculation belongs to another colleague");
    }
    const { error } = await admin.from("crm_value_models").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** A4 value report, in the language the prospect reads. */
export const exportValueReportPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_name: z.string().trim().min(1).max(200),
        assumptions: z.string().trim().max(4000).nullish(),
        lang: z.enum(["en", "de", "ro"]).default("en"),
        inputs: inputsSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await staff(context as never);
    const { buildValueReport } = await import("@/lib/value-report.server");
    const bytes = await buildValueReport({
      companyName: data.company_name,
      assumptions: data.assumptions ?? null,
      lang: data.lang,
      inputs: data.inputs as ValueInputs,
    });
    const slug = data.company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    return {
      filename: `opsqai-value-report-${slug || "customer"}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  });
