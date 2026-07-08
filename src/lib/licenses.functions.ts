import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformAdmin } from "@/lib/authorization";
import { z } from "zod";
import { BASIC_MODULES, isValidModuleKey } from "@/lib/license-modules";

const IssueInput = z.object({
  install_id: z.string().min(3).max(64).regex(/^[a-z0-9][a-z0-9-]{2,}$/, "lowercase, digits, dashes"),
  company_name: z.string().min(1).max(200),
  contact_email: z.string().email().optional(),
  tier: z.enum(["basic", "standard", "business", "enterprise"]).default("basic"),
  add_on_modules: z.array(z.string()).default([]),
  max_users: z.number().int().positive().default(50),
  expires_at: z.string().datetime().nullable().optional(),
  hard_expiry: z.boolean().default(false),
  notes: z.string().optional(),
});

export const listLicenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { data, error } = await context.supabase
      .from("licenses")
      .select("id, install_id, company_name, contact_email, tier, modules, max_users, issued_at, expires_at, hard_expiry, revoked, revoked_at, notes, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (data ?? []).map((l) => l.install_id);
    const { data: installs } = ids.length
      ? await context.supabase.from("license_installs").select("install_id, last_heartbeat_at, app_version, user_count").in("install_id", ids)
      : { data: [] as Array<{ install_id: string; last_heartbeat_at: string | null; app_version: string | null; user_count: number | null }> };
    const byInstall = new Map((installs ?? []).map((i) => [i.install_id, i]));

    return (data ?? []).map((l) => ({ ...l, install: byInstall.get(l.install_id) ?? null }));
  });

export const issueLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IssueInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);

    const modules = Array.from(new Set([
      ...BASIC_MODULES,
      ...data.add_on_modules.filter(isValidModuleKey),
    ]));

    const { signLicense } = await import("@/lib/license-signing.server");
    const issuedAt = Math.floor(Date.now() / 1000);
    const expSec = data.expires_at ? Math.floor(new Date(data.expires_at).getTime() / 1000) : null;
    const { token } = await signLicense({
      install_id: data.install_id,
      company_name: data.company_name,
      tier: data.tier,
      modules,
      max_users: data.max_users,
      issued_at: issuedAt,
      expires_at: expSec,
      hard_expiry: data.hard_expiry,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("licenses").insert({
      install_id: data.install_id,
      company_name: data.company_name,
      contact_email: data.contact_email ?? null,
      tier: data.tier,
      modules,
      max_users: data.max_users,
      expires_at: data.expires_at ?? null,
      hard_expiry: data.hard_expiry,
      signed_token: token,
      notes: data.notes ?? null,
      issued_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true, token, install_id: data.install_id, modules };
  });

export const revokeLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ install_id: z.string(), reason: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { error } = await context.supabase.from("licenses")
      .update({ revoked: true, revoked_at: new Date().toISOString(), revoked_reason: data.reason ?? null })
      .eq("install_id", data.install_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addModuleToLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    install_id: z.string(),
    module_key: z.string().refine(isValidModuleKey, "unknown module"),
    unit_price_cents: z.number().int().min(0).default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: current, error: fetchErr } = await supabaseAdmin
      .from("licenses")
      .select("install_id, company_name, tier, modules, max_users, expires_at, hard_expiry")
      .eq("install_id", data.install_id)
      .maybeSingle();
    if (fetchErr || !current) throw new Error(fetchErr?.message || "License not found");

    const currentModules = Array.isArray(current.modules) ? current.modules as string[] : [];
    if (currentModules.includes(data.module_key)) {
      return { ok: true, already_included: true, token: null };
    }
    const nextModules = [...currentModules, data.module_key];

    const { signLicense } = await import("@/lib/license-signing.server");
    const { token } = await signLicense({
      install_id: current.install_id,
      company_name: current.company_name,
      tier: (current.tier ?? "basic") as "basic" | "standard" | "business" | "enterprise",
      modules: nextModules,
      max_users: current.max_users,
      issued_at: Math.floor(Date.now() / 1000),
      expires_at: current.expires_at ? Math.floor(new Date(current.expires_at as string).getTime() / 1000) : null,
      hard_expiry: current.hard_expiry,
    });

    const { error: upErr } = await supabaseAdmin.from("licenses")
      .update({ modules: nextModules, signed_token: token })
      .eq("install_id", data.install_id);
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin.from("license_orders").insert({
      install_id: data.install_id,
      module_key: data.module_key,
      unit_price_cents: data.unit_price_cents,
      status: "paid",
      paid_at: new Date().toISOString(),
      created_by: context.userId,
    });

    return { ok: true, already_included: false, token };
  });

export const getLicensePublicKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { data } = await context.supabase
      .from("license_signing_keys")
      .select("public_key_pem, key_id, algorithm, created_at")
      .eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) {
      // Force generation by signing a dummy — cleaner: expose via issueLicense flow.
      const { getActiveSigningKey } = await import("@/lib/license-signing.server");
      const k = await getActiveSigningKey();
      return { public_key_pem: k.publicPem, key_id: k.keyId, algorithm: "ed25519" };
    }
    return data;
  });
