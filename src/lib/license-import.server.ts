// Self-Hosted "Add License" import (Phase 4).
//
// Runs on the customer's Self-Hosted install. Given a pasted signed token
// (Installation License or Module License), it:
//   1. Verifies the Ed25519 signature against the pinned public PEM
//      (looked up from local `license_signing_keys` by `key_id`).
//   2. Validates license_version, kind, expiry, and — when known —
//      that `install_id` matches this install.
//   3. Upserts a mirror row into the local `licenses` table so
//      `license-enforcement.server.ts` can gate paid modules offline.
//
// The signature stays authoritative; the DB row is just a cache used by
// enforcement (which never re-verifies signatures on every request).

import {
  peekTokenKeyId,
  verifyLicenseTokenTyped,
  type InstallLicensePayload,
  type ModuleLicensePayload,
  type AnyLicensePayload,
  type VerifyReason,
} from "@/lib/license-signing.server";
import { verifyCrl, type CrlEntry, type CrlVerifyReason } from "@/lib/license-crl.server";
import { isValidModuleKey } from "@/lib/license-modules";

export type ImportReason =
  | VerifyReason
  | "unknown_module"
  | "no_pinned_key"
  | "db_error";

export interface ImportResult {
  ok: boolean;
  reason?: ImportReason;
  install_id?: string;
  kind?: "install" | "module";
  module_key?: string | null;
}

async function loadPinnedPublicPem(keyId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("license_signing_keys")
    .select("public_key_pem")
    .eq("key_id", keyId)
    .maybeSingle();
  return data?.public_key_pem ?? null;
}

/**
 * Pure verify (no DB write, no upsert). Used by both the interactive Add
 * License UI (for a dry-run preview) and the actual import handler.
 */
export async function verifyTokenForImport(
  token: string,
  opts?: { expectedInstallId?: string; now?: number },
): Promise<
  | { ok: true; payload: AnyLicensePayload }
  | { ok: false; reason: ImportReason }
> {
  const keyId = peekTokenKeyId(token);
  if (!keyId) return { ok: false, reason: "malformed" };

  const pem = await loadPinnedPublicPem(keyId);
  if (!pem) return { ok: false, reason: "no_pinned_key" };

  // Try install first, then module, so we can report the right kind.
  const asInstall = verifyLicenseTokenTyped(token, pem, "install", opts?.now);
  const asModule = verifyLicenseTokenTyped(token, pem, "module", opts?.now);
  const good = asInstall.ok ? asInstall : asModule.ok ? asModule : null;
  if (!good) {
    // Prefer the non-"wrong_kind" reason for a clearer error message.
    const reason: VerifyReason =
      asInstall.ok === false && asInstall.reason !== "wrong_kind"
        ? asInstall.reason
        : asModule.ok === false
          ? asModule.reason
          : "malformed";
    return { ok: false, reason };
  }

  const payload = good.payload as AnyLicensePayload;

  if (payload.kind === "module") {
    const mp = payload as ModuleLicensePayload;
    if (!isValidModuleKey(mp.module)) return { ok: false, reason: "unknown_module" };
  }

  if (opts?.expectedInstallId && payload.install_id !== opts.expectedInstallId) {
    return { ok: false, reason: "install_mismatch" };
  }

  return { ok: true, payload };
}

/**
 * Verify + upsert a signed token into the local `licenses` mirror.
 * Uses supabaseAdmin because the mirror is a system-level cache and is
 * written on behalf of the pasted token, not the current user.
 */
export async function importLicenseToken(
  token: string,
  opts?: { expectedInstallId?: string; issuedBy?: string | null },
): Promise<ImportResult> {
  const v = await verifyTokenForImport(token, { expectedInstallId: opts?.expectedInstallId });
  if (!v.ok) return { ok: false, reason: v.reason };

  const p = v.payload;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const expiresAtIso = p.expires_at ? new Date(p.expires_at * 1000).toISOString() : null;
  const maintIso = p.maintenance_expires_at ? new Date(p.maintenance_expires_at * 1000).toISOString() : null;

  if (p.kind === "install") {
    const ip = p as InstallLicensePayload;
    // Upsert on install_id (kind='install').
    const { data: existing } = await supabaseAdmin
      .from("licenses")
      .select("id")
      .eq("install_id", ip.install_id)
      .eq("kind", "install")
      .maybeSingle();

    const row = {
      install_id: ip.install_id,
      kind: "install" as const,
      module_key: null,
      company_name: ip.customer,
      tier: "basic",
      modules: [],
      seats: ip.seats,
      max_users: ip.seats,
      expires_at: expiresAtIso,
      maintenance_expires_at: maintIso,
      signed_token: token,
      license_version: 1,
      revoked: false,
      revoked_at: null,
      revoked_reason: null,
      suspended: false,
      suspended_at: null,
      suspended_reason: null,
      issued_by: opts?.issuedBy ?? null,
    };

    const { error } = existing
      ? await supabaseAdmin.from("licenses").update(row).eq("id", existing.id)
      : await supabaseAdmin.from("licenses").insert(row);
    if (error) return { ok: false, reason: "db_error" };
    return { ok: true, install_id: ip.install_id, kind: "install", module_key: null };
  }

  const mp = p as ModuleLicensePayload;
  const { data: existing } = await supabaseAdmin
    .from("licenses")
    .select("id")
    .eq("install_id", mp.install_id)
    .eq("kind", "module")
    .eq("module_key", mp.module)
    .maybeSingle();

  const row = {
    install_id: mp.install_id,
    kind: "module" as const,
    module_key: mp.module,
    company_name: "",
    modules: [],
    max_users: 0,
    expires_at: expiresAtIso,
    maintenance_expires_at: maintIso,
    signed_token: token,
    license_version: 1,
    revoked: false,
    revoked_at: null,
    revoked_reason: null,
    suspended: false,
    suspended_at: null,
    suspended_reason: null,
    issued_by: opts?.issuedBy ?? null,
  };

  const { error } = existing
    ? await supabaseAdmin.from("licenses").update(row).eq("id", existing.id)
    : await supabaseAdmin.from("licenses").insert(row);
  if (error) return { ok: false, reason: "db_error" };
  return { ok: true, install_id: mp.install_id, kind: "module", module_key: mp.module };
}

// ─── Revocation-list import ────────────────────────────────────────────

export interface CrlImportSummary {
  ok: boolean;
  reason?: CrlVerifyReason | "no_pinned_key" | "db_error";
  applied: number;
  entries: number;
  issued_at?: number;
}

/** Verify + apply a pasted CRL to the local `licenses` mirror. */
export async function importRevocationList(token: string): Promise<CrlImportSummary> {
  // We need the key_id to fetch the pinned PEM.
  const parts = token.split(".");
  if (parts.length !== 4) return { ok: false, reason: "malformed", applied: 0, entries: 0 };
  let keyId: string | null = null;
  try {
    const p = JSON.parse(Buffer.from(parts[2].replaceAll("-", "+").replaceAll("_", "/"), "base64").toString());
    keyId = typeof p.key_id === "string" ? p.key_id : null;
  } catch {
    /* fall through */
  }
  if (!keyId) return { ok: false, reason: "malformed", applied: 0, entries: 0 };

  const pem = await loadPinnedPublicPem(keyId);
  if (!pem) return { ok: false, reason: "no_pinned_key", applied: 0, entries: 0 };

  const res = verifyCrl(token, pem);
  if (!res.ok) return { ok: false, reason: res.reason, applied: 0, entries: 0 };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let applied = 0;
  for (const e of res.payload.entries as CrlEntry[]) {
    let q = supabaseAdmin
      .from("licenses")
      .update({
        revoked: e.revoked,
        revoked_at: e.revoked_at,
        suspended: e.suspended,
        suspended_at: e.suspended_at,
      })
      .eq("install_id", e.install_id)
      .eq("kind", e.kind);
    if (e.kind === "module" && e.module_key) q = q.eq("module_key", e.module_key);
    const { data: updated, error } = await q.select("id");
    if (!error) applied += updated?.length ?? 0;
  }

  return { ok: true, applied, entries: res.payload.entries.length, issued_at: res.payload.issued_at };
}
