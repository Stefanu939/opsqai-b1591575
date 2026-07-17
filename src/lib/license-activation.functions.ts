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
