import { getCloudSupabase , getCloudSupabaseAdmin} from "@/lib/providers/not-available";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { z } from "zod";
import { isValidModuleKey, BASIC_MODULES } from "@/lib/license-modules";
import { assertNoBlacklistedSecrets } from "@/lib/mc-secrets-blacklist";

// ─── Input schemas ──────────────────────────────────────────────────────

const InstallIdSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]{2,}$/, "lowercase, digits, dashes");

const IssueInstallInput = z.object({
  install_id: InstallIdSchema,
  company_name: z.string().min(1).max(200),
  contact_email: z.string().email().optional(),
  tier: z.enum(["basic", "standard", "business", "enterprise"]).default("basic"),
  seats: z.number().int().positive().default(50),
  expires_at: z.string().datetime().nullable().optional(),
  maintenance_expires_at: z.string().datetime().nullable().optional(),
  notes: z.string().optional(),
});

const IssueModuleInput = z.object({
  install_id: InstallIdSchema,
  module_key: z.string().refine(isValidModuleKey, "unknown module"),
  expires_at: z.string().datetime().nullable().optional(),
  maintenance_expires_at: z.string().datetime().nullable().optional(),
  unit_price_cents: z.number().int().min(0).default(0),
});

const RevokeInput = z.object({
  install_id: InstallIdSchema,
  kind: z.enum(["install", "module"]).default("install"),
  module_key: z.string().optional(),
  reason: z.string().optional(),
});

// ─── Read ───────────────────────────────────────────────────────────────

export const listLicenses = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { data, error } = await getCloudSupabase(context, "licenses")
      .from("licenses")
      .select(
        "id, install_id, kind, module_key, company_name, contact_email, tier, seats, max_users, issued_at, expires_at, maintenance_expires_at, revoked, revoked_at, suspended, suspended_at, notes, created_at, owner_type, owner_since, handed_over_at, handover_notes",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const installs = rows.filter((r) => r.kind === "install");
    const modules = rows.filter((r) => r.kind === "module");
    const modulesByInstall = new Map<string, typeof modules>();
    for (const m of modules) {
      const list = modulesByInstall.get(m.install_id) ?? [];
      list.push(m);
      modulesByInstall.set(m.install_id, list);
    }

    const ids = installs.map((l) => l.install_id);
    const { data: installMeta } = ids.length
      ? await getCloudSupabase(context, "licenses")
          .from("license_installs")
          .select("install_id, last_heartbeat_at, app_version, installer_version, user_count")
          .in("install_id", ids)
      : {
          data: [] as Array<{
            install_id: string;
            last_heartbeat_at: string | null;
            app_version: string | null;
            installer_version: string | null;
            user_count: number | null;
          }>,
        };
    const byInstall = new Map((installMeta ?? []).map((i) => [i.install_id, i]));

    return installs.map((l) => ({
      ...l,
      install: byInstall.get(l.install_id) ?? null,
      modules: modulesByInstall.get(l.install_id) ?? [],
    }));
  });

// ─── Issue Installation License ─────────────────────────────────────────

export const issueLicense = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => IssueInstallInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    assertNoBlacklistedSecrets(data, "issueLicense input");

    const { signInstallLicense } = await import("@/lib/license-signing.server");
    const issuedAt = Math.floor(Date.now() / 1000);
    const expSec = data.expires_at ? Math.floor(new Date(data.expires_at).getTime() / 1000) : null;
    const maintSec = data.maintenance_expires_at
      ? Math.floor(new Date(data.maintenance_expires_at).getTime() / 1000)
      : expSec;

    const { token } = await signInstallLicense({
      install_id: data.install_id,
      customer: data.company_name,
      seats: data.seats,
      issued_at: issuedAt,
      expires_at: expSec,
      maintenance_expires_at: maintSec,
    });

    const supabaseAdmin = await getCloudSupabaseAdmin("licenses");
    const { error } = await supabaseAdmin.from("licenses").insert({
      install_id: data.install_id,
      kind: "install",
      module_key: null,
      company_name: data.company_name,
      contact_email: data.contact_email ?? null,
      tier: data.tier,
      modules: [],
      seats: data.seats,
      max_users: data.seats,
      expires_at: data.expires_at ?? null,
      maintenance_expires_at: data.maintenance_expires_at ?? data.expires_at ?? null,
      signed_token: token,
      notes: data.notes ?? null,
      issued_by: context.userId,
      license_version: 1,
    });
    if (error) throw new Error(error.message);
    return { ok: true, token, install_id: data.install_id, basic_modules: BASIC_MODULES };
  });

// ─── Issue Module License ───────────────────────────────────────────────

export const issueModuleLicense = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => IssueModuleInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    assertNoBlacklistedSecrets(data, "issueModuleLicense input");
    const supabaseAdmin = await getCloudSupabaseAdmin("licenses");

    // Installation License must exist first.
    const { data: install } = await supabaseAdmin
      .from("licenses")
      .select("install_id, expires_at")
      .eq("install_id", data.install_id)
      .eq("kind", "install")
      .maybeSingle();
    if (!install) throw new Error("No Installation License for this install_id — issue one first.");

    const { signModuleLicense } = await import("@/lib/license-signing.server");
    const issuedAt = Math.floor(Date.now() / 1000);
    const expSec = data.expires_at ? Math.floor(new Date(data.expires_at).getTime() / 1000) : null;
    const maintSec = data.maintenance_expires_at
      ? Math.floor(new Date(data.maintenance_expires_at).getTime() / 1000)
      : expSec;

    const { token } = await signModuleLicense({
      install_id: data.install_id,
      module: data.module_key,
      issued_at: issuedAt,
      expires_at: expSec,
      maintenance_expires_at: maintSec,
    });

    // Upsert (install_id, module_key) — re-issue replaces the previous token.
    const { data: existing } = await supabaseAdmin
      .from("licenses")
      .select("id")
      .eq("install_id", data.install_id)
      .eq("kind", "module")
      .eq("module_key", data.module_key)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("licenses")
        .update({
          signed_token: token,
          expires_at: data.expires_at ?? null,
          maintenance_expires_at: data.maintenance_expires_at ?? data.expires_at ?? null,
          revoked: false,
          revoked_at: null,
          revoked_reason: null,
          suspended: false,
          suspended_at: null,
          suspended_reason: null,
          issued_by: context.userId,
          license_version: 1,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("licenses").insert({
        install_id: data.install_id,
        kind: "module",
        module_key: data.module_key,
        company_name: "", // module rows inherit company from install
        modules: [],
        max_users: 0,
        expires_at: data.expires_at ?? null,
        maintenance_expires_at: data.maintenance_expires_at ?? data.expires_at ?? null,
        signed_token: token,
        issued_by: context.userId,
        license_version: 1,
      });
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("license_orders").insert({
      install_id: data.install_id,
      module_key: data.module_key,
      unit_price_cents: data.unit_price_cents,
      status: "paid",
      paid_at: new Date().toISOString(),
      created_by: context.userId,
    });

    return { ok: true, token, install_id: data.install_id, module_key: data.module_key };
  });

// ─── Revoke ─────────────────────────────────────────────────────────────

export const revokeLicense = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => RevokeInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    let q = getCloudSupabase(context, "licenses")
      .from("licenses")
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_reason: data.reason ?? null,
      })
      .eq("install_id", data.install_id)
      .eq("kind", data.kind);
    if (data.kind === "module") {
      if (!data.module_key) throw new Error("module_key required to revoke a Module License");
      q = q.eq("module_key", data.module_key);
    }
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Delete (hard remove license and its module rows) ───────────────────

export const deleteLicense = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ install_id: InstallIdSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("licenses");
    const { error } = await supabaseAdmin
      .from("licenses")
      .delete()
      .eq("install_id", data.install_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });



// ─── Signing public key (for installer bundling) ────────────────────────

export const getLicensePublicKey = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { data } = await getCloudSupabase(context, "licenses")
      .from("license_signing_keys")
      .select("public_key_pem, key_id, algorithm, created_at")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) {
      const { getActiveSigningKey } = await import("@/lib/license-signing.server");
      const k = await getActiveSigningKey();
      return { public_key_pem: k.publicPem, key_id: k.keyId, algorithm: "ed25519" };
    }
    return data;
  });

// ─── View a module token (re-copy from admin UI) ────────────────────────

export const getModuleToken = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        install_id: InstallIdSchema,
        module_key: z.string().refine(isValidModuleKey, "unknown module"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { data: row, error } = await getCloudSupabase(context, "licenses")
      .from("licenses")
      .select("signed_token, revoked, suspended, expires_at, maintenance_expires_at")
      .eq("install_id", data.install_id)
      .eq("kind", "module")
      .eq("module_key", data.module_key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Module License not found");
    return row;
  });

// ─── Ownership transfer (Phase 4.5) ─────────────────────────────────────
//
// Records that an install has been handed over from OPSQAI to the customer
// (or reverted). MC MUST NOT store any customer infrastructure secrets —
// the input is passed through the secrets-blacklist gate. Only metadata:
// who owns the install and free-text (non-secret) notes.

const TransferOwnershipInput = z.object({
  install_id: InstallIdSchema,
  to: z.enum(["opsqai", "customer"]),
  notes: z.string().max(2000).optional(),
});

export const transferOwnership = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => TransferOwnershipInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    assertNoBlacklistedSecrets(data, "transferOwnership input");

    const supabaseAdmin = await getCloudSupabaseAdmin("licenses");
    const { data: current } = await supabaseAdmin
      .from("licenses")
      .select("id, owner_type, handed_over_at")
      .eq("install_id", data.install_id)
      .eq("kind", "install")
      .maybeSingle();
    if (!current) throw new Error("No Installation License for this install_id.");
    if (current.owner_type === data.to) {
      return { ok: true, install_id: data.install_id, owner_type: data.to, unchanged: true };
    }

    const nowIso = new Date().toISOString();
    const patch: {
      owner_type: "opsqai" | "customer";
      owner_since: string;
      handover_notes: string | null;
      handed_over_at?: string;
    } = {
      owner_type: data.to,
      owner_since: nowIso,
      handover_notes: data.notes ?? null,
    };
    if (data.to === "customer" && !current.handed_over_at) {
      patch.handed_over_at = nowIso;
    }

    const { error } = await supabaseAdmin.from("licenses").update(patch).eq("id", current.id);
    if (error) throw new Error(error.message);
    return { ok: true, install_id: data.install_id, owner_type: data.to, unchanged: false };
  });
