// Server functions for Phase 4 offline activation.
//
// Two audiences:
//   • Management Center admin exports an "Activation Bundle" (install token
//     + all module tokens + signed CRL + public PEM) and a standalone CRL.
//   • Self-Hosted admin pastes a token (or bundle) into the Add License
//     screen to activate/refresh their install.

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { z } from "zod";

const InstallIdSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]{2,}$/, "lowercase, digits, dashes");

// ─── MC: export a full activation bundle for one install ────────────────

export interface ActivationBundle {
  bundle_version: 1;
  install_id: string;
  public_key_pem: string;
  key_id: string;
  install_token: string;
  module_tokens: Array<{ module_key: string; signed_token: string }>;
  crl_token: string;
  issued_at: number;
}

export const exportActivationBundle = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ install_id: InstallIdSchema }).parse(d))
  .handler(async ({ data, context }): Promise<ActivationBundle> => {
    await requirePlatformAdmin(context);
    const { buildActivationBundle } = await import("@/lib/license-activation-core.server");
    return buildActivationBundle(data.install_id);
  });

export const exportRevocationList = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { buildAndSignCrl } = await import("@/lib/license-crl.server");
    const { token, payload } = await buildAndSignCrl();
    return {
      token,
      issued_at: payload.issued_at,
      entries: payload.entries.length,
      key_id: payload.key_id,
    };
  });

// ─── Self-Hosted: paste a single token to activate ──────────────────────

const ImportTokenInput = z.object({
  token: z.string().min(20).max(8192),
  expected_install_id: InstallIdSchema.optional(),
});

export const importActivationToken = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ImportTokenInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (isSelfHosted()) {
      const { activateSelfHostLicense } = await import("@/lib/selfhost-license-activation.server");
      return activateSelfHostLicense(data.token.trim(), data.expected_install_id);
    }
    const { importLicenseToken } = await import("@/lib/license-import.server");
    const res = await importLicenseToken(data.token.trim(), {
      expectedInstallId: data.expected_install_id,
      issuedBy: context.userId ?? null,
    });
    if (!res.ok) throw new Error(`import_denied:${res.reason}`);
    return res;
  });

// ─── Self-Hosted: dry-run verify (no DB write) ──────────────────────────

export const previewActivationToken = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ImportTokenInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (isSelfHosted()) {
      const { previewSelfHostLicense } = await import("@/lib/selfhost-license-activation.server");
      return previewSelfHostLicense(data.token.trim(), data.expected_install_id);
    }
    const { verifyTokenForImport } = await import("@/lib/license-import.server");
    const res = await verifyTokenForImport(data.token.trim(), {
      expectedInstallId: data.expected_install_id,
    });
    if (!res.ok) return { ok: false as const, reason: res.reason };
    const p = res.payload;
    return {
      ok: true as const,
      kind: p.kind,
      install_id: p.install_id,
      key_id: p.key_id,
      expires_at: p.expires_at,
      maintenance_expires_at: p.maintenance_expires_at,
      customer: p.kind === "install" ? p.customer : undefined,
      seats: p.kind === "install" ? p.seats : undefined,
      module: p.kind === "module" ? p.module : undefined,
    };
  });

// ─── Self-Hosted: import a full activation bundle ───────────────────────

const BundleInput = z.object({
  bundle_json: z.string().min(10).max(65536),
});

export const importActivationBundle = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => BundleInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (isSelfHosted()) {
      const { activateSelfHostLicense } = await import("@/lib/selfhost-license-activation.server");
      const body = data.bundle_json.trim();
      // Self-Hosted accepts either a signed bundle JWT or a JSON bundle whose
      // install/module tokens are activated individually.
      if (!body.startsWith("{")) return activateSelfHostLicense(body);
      let parsedJson: ActivationBundle;
      try {
        parsedJson = JSON.parse(body) as ActivationBundle;
      } catch {
        throw new Error("import_denied:malformed_bundle");
      }
      if (parsedJson.bundle_version !== 1 || !parsedJson.install_token) {
        throw new Error("import_denied:unknown_bundle_version");
      }
      const install = await activateSelfHostLicense(
        parsedJson.install_token,
        parsedJson.install_id,
      );
      const modules: Array<{ module_key: string; ok: boolean; reason?: string }> = [];
      for (const m of parsedJson.module_tokens ?? []) {
        try {
          await activateSelfHostLicense(m.signed_token, parsedJson.install_id);
          modules.push({ module_key: m.module_key, ok: true });
        } catch (e) {
          modules.push({ module_key: m.module_key, ok: false, reason: (e as Error).message });
        }
      }
      return { ok: true, install, modules, crl: null };
    }
    let parsed: ActivationBundle;
    try {
      parsed = JSON.parse(data.bundle_json) as ActivationBundle;
    } catch {
      throw new Error("import_denied:malformed_bundle");
    }
    if (parsed.bundle_version !== 1 || !parsed.install_token) {
      throw new Error("import_denied:unknown_bundle_version");
    }

    const { importLicenseToken, importRevocationList } =
      await import("@/lib/license-import.server");

    const installRes = await importLicenseToken(parsed.install_token, {
      expectedInstallId: parsed.install_id,
      issuedBy: context.userId ?? null,
    });
    if (!installRes.ok) throw new Error(`import_denied:install:${installRes.reason}`);

    const moduleResults: Array<{ module_key: string; ok: boolean; reason?: string }> = [];
    for (const m of parsed.module_tokens ?? []) {
      const r = await importLicenseToken(m.signed_token, {
        expectedInstallId: parsed.install_id,
        issuedBy: context.userId ?? null,
      });
      moduleResults.push({ module_key: m.module_key, ok: r.ok, reason: r.reason });
    }

    let crl: Awaited<ReturnType<typeof importRevocationList>> | null = null;
    if (parsed.crl_token) crl = await importRevocationList(parsed.crl_token);

    return {
      ok: true,
      install: installRes,
      modules: moduleResults,
      crl,
    };
  });

// ─── Self-Hosted: import a standalone CRL ───────────────────────────────

export const importRevocationListFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(20).max(65536) }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { importRevocationList } = await import("@/lib/license-import.server");
    const res = await importRevocationList(data.token.trim());
    if (!res.ok) throw new Error(`crl_import_denied:${res.reason}`);
    return res;
  });

// ─── Self-Hosted: activation history (local license mirror) ─────────────

export interface ActivatedLicenseRow {
  id: string;
  kind: string;
  module_key: string | null;
  install_id: string | null;
  company_name: string | null;
  expires_at: string | null;
  maintenance_expires_at: string | null;
  revoked: boolean;
  suspended: boolean;
  validated_at: string | null;
}

export const listActivatedLicenses = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<ActivatedLicenseRow[]> => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("licenses")
      .select(
        "id, kind, module_key, install_id, company_name, expires_at, maintenance_expires_at, revoked, suspended, validated_at",
      )
      .order("validated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ActivatedLicenseRow[];
  });
