// Self-Hosted license activation.
//
// The Cloud path (`license-import.server.ts`) writes to the Cloud mirror via
// the service-role client, which does not exist inside a Self-Hosted build.
// Here everything is local and offline:
//   • verification uses the pinned Ed25519 public key on disk
//   • an installation token / activation bundle replaces the license file
//   • a module token is appended to the module sidecar next to it
//   • history is read back from those same signed artifacts

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createPublicKey, type KeyObject } from "node:crypto";

import {
  isActivationBundlePayload,
  moduleSidecarPath,
  readModuleSidecar,
  verifyCompactToken,
} from "@/lib/providers/selfhost/local-licensing.server";

interface Claims {
  kind?: "install" | "module";
  install_id?: string;
  key_id?: string;
  exp?: number;
  expires_at?: number | null;
  maintenance_expires_at?: number | null;
  customer?: string;
  company_name?: string;
  seats?: number;
  max_users?: number;
  module?: string;
  bundle_version?: number;
  install_token?: string;
  module_tokens?: Array<{ module_key: string; signed_token: string }>;
}

function licenseFilePath(): string {
  return (
    process.env["OPSQAI_LICENSE_FILE_PATH"] ??
    "C:/ProgramData/OPSQAI/config/license.opsqai"
  );
}

async function publicKey(): Promise<KeyObject> {
  const path = process.env["OPSQAI_LICENSE_PUBLIC_KEY_PATH"];
  if (!path) throw new Error("license_public_key_not_configured");
  return createPublicKey(await readFile(path, "utf8"));
}

function expiry(c: Claims): number | undefined {
  if (typeof c.exp === "number") return c.exp;
  if (typeof c.expires_at === "number") return c.expires_at;
  return undefined;
}

export interface SelfHostPreview {
  ok: true;
  kind: "install" | "module" | "bundle";
  install_id?: string;
  key_id?: string;
  expires_at?: number;
  maintenance_expires_at?: number | null;
  customer?: string | null;
  seats?: number | null;
  module?: string;
  modules?: string[];
}

/** Verify a pasted token or bundle without writing anything. */
export async function previewSelfHostLicense(
  token: string,
  expectedInstallId?: string,
): Promise<SelfHostPreview | { ok: false; reason: string }> {
  let payload: Claims;
  try {
    payload = verifyCompactToken(token, await publicKey()) as Claims;
  } catch (e) {
    return { ok: false, reason: (e as Error).message || "invalid_signature" };
  }

  const key = await publicKey();

  if (isActivationBundlePayload(payload)) {
    let install: Claims;
    try {
      install = verifyCompactToken(payload.install_token!, key) as Claims;
    } catch {
      return { ok: false, reason: "bundle_install_token_invalid" };
    }
    return {
      ok: true,
      kind: "bundle",
      install_id: install.install_id ?? payload.install_id,
      key_id: install.key_id,
      expires_at: expiry(install),
      maintenance_expires_at: install.maintenance_expires_at ?? null,
      customer: install.customer ?? install.company_name ?? null,
      seats: install.seats ?? install.max_users ?? null,
      modules: (payload.module_tokens ?? []).map((m) => m.module_key),
    };
  }

  const expected = expectedInstallId ?? process.env["OPSQAI_INSTALL_ID"];
  if (expected && payload.install_id && payload.install_id !== expected) {
    return { ok: false, reason: "install_id_mismatch" };
  }
  const exp = expiry(payload);
  if (exp && exp * 1000 < Date.now()) return { ok: false, reason: "expired" };

  if (payload.kind === "module") {
    if (!payload.module) return { ok: false, reason: "module_missing" };
    return {
      ok: true,
      kind: "module",
      module: payload.module,
      install_id: payload.install_id,
      key_id: payload.key_id,
      expires_at: exp,
      maintenance_expires_at: payload.maintenance_expires_at ?? null,
    };
  }

  return {
    ok: true,
    kind: "install",
    install_id: payload.install_id,
    key_id: payload.key_id,
    expires_at: exp,
    maintenance_expires_at: payload.maintenance_expires_at ?? null,
    customer: payload.customer ?? payload.company_name ?? null,
    seats: payload.seats ?? payload.max_users ?? null,
  };
}

/** Verify and persist a license on this installation. */
export async function activateSelfHostLicense(
  token: string,
  expectedInstallId?: string,
): Promise<{ ok: true; kind: string; module?: string; modules?: string[] }> {
  const pre = await previewSelfHostLicense(token, expectedInstallId);
  if (!pre.ok) throw new Error(`import_denied:${pre.reason}`);

  const file = licenseFilePath();
  await mkdir(dirname(file), { recursive: true }).catch(() => undefined);

  if (pre.kind === "module") {
    const existing = await readModuleSidecar(file);
    const next = [
      ...existing.filter((e) => e.module_key !== pre.module),
      { module_key: pre.module!, signed_token: token.trim() },
    ];
    await writeFile(moduleSidecarPath(file), JSON.stringify(next, null, 2), "utf8");
    return { ok: true, kind: "module", module: pre.module };
  }

  // Installation token or full activation bundle replaces the license file.
  await writeFile(file, token.trim(), "utf8");
  return { ok: true, kind: pre.kind, modules: pre.modules };
}

export interface SelfHostActivationRow {
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

const iso = (secs?: number | null) =>
  typeof secs === "number" && secs > 0 ? new Date(secs * 1000).toISOString() : null;

/** Activation history assembled from the local signed artifacts. */
export async function listSelfHostActivations(): Promise<SelfHostActivationRow[]> {
  const file = licenseFilePath();
  const key = await publicKey().catch(() => null);
  if (!key) return [];
  const rows: SelfHostActivationRow[] = [];

  try {
    const raw = (await readFile(file, "utf8")).trim();
    const payload = verifyCompactToken(raw, key) as Claims;
    const install = isActivationBundlePayload(payload)
      ? (verifyCompactToken(payload.install_token!, key) as Claims)
      : payload;
    rows.push({
      id: "install",
      kind: "install",
      module_key: null,
      install_id: install.install_id ?? null,
      company_name: install.customer ?? install.company_name ?? null,
      expires_at: iso(expiry(install)),
      maintenance_expires_at: iso(install.maintenance_expires_at),
      revoked: false,
      suspended: false,
      validated_at: null,
    });
    if (isActivationBundlePayload(payload)) {
      for (const m of payload.module_tokens ?? []) {
        try {
          const c = verifyCompactToken(m.signed_token, key) as Claims;
          rows.push({
            id: `bundle:${c.module ?? m.module_key}`,
            kind: "module",
            module_key: c.module ?? m.module_key,
            install_id: c.install_id ?? null,
            company_name: install.customer ?? install.company_name ?? null,
            expires_at: iso(expiry(c)),
            maintenance_expires_at: iso(c.maintenance_expires_at),
            revoked: false,
            suspended: false,
            validated_at: null,
          });
        } catch {
          /* skip unverifiable entry */
        }
      }
    }
  } catch {
    /* no installation license yet */
  }

  for (const entry of await readModuleSidecar(file)) {
    try {
      const c = verifyCompactToken(entry.signed_token, key) as Claims;
      const exp = expiry(c);
      rows.push({
        id: `sidecar:${c.module ?? entry.module_key}`,
        kind: "module",
        module_key: c.module ?? entry.module_key,
        install_id: c.install_id ?? null,
        company_name: null,
        expires_at: iso(exp),
        maintenance_expires_at: iso(c.maintenance_expires_at),
        revoked: false,
        suspended: Boolean(exp && exp * 1000 < Date.now()),
        validated_at: null,
      });
    } catch {
      /* skip unverifiable entry */
    }
  }

  return rows;
}
