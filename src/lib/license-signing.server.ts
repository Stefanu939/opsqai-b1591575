// Ed25519 license-token signing.
//
// Design:
// - License Server holds an Ed25519 keypair in `public.license_signing_keys`.
// - The PRIVATE key stays server-only (column-level GRANT excludes it from
//   `authenticated`; only service_role reads it).
// - Self-hosted OPSQAI installs verify tokens locally with the PUBLIC key,
//   fetched once during setup wizard from the License Server release feed.
//
// Token shape (compact "opsqai.v1"): `opsqai.v1.<payloadB64>.<sigB64>`.
// The "v1" segment is the token-envelope version; inside the payload we
// additionally carry `license_version` so the payload format can evolve
// non-breakingly (Phase 0 amendment 2).
//
// Two license KINDS (Phase 0):
//   - "install" — mandatory, one per install_id. Carries `seats` +
//                 `maintenance_expires_at`.
//   - "module"  — optional, one signed token per paid module. No `seats`.
//                 Each has its own `expires_at` + `maintenance_expires_at`.
//
// Legacy `LicensePayload` (bundled `modules[]` + `tier` + `max_users`) is
// kept for backward compatibility until Phase 1 migrates callers.

import { generateKeyPairSync, createPrivateKey, createPublicKey, sign as edSign, verify as edVerify, randomUUID } from "node:crypto";

// ─── Versioned typed payloads (Phase 0) ─────────────────────────────────

export type LicenseKind = "install" | "module";

interface BaseLicensePayload {
  license_version: 1;
  kind: LicenseKind;
  install_id: string;
  key_id: string;
  issued_at: number;
  expires_at: number | null;
  maintenance_expires_at: number | null;
}

export interface InstallLicensePayload extends BaseLicensePayload {
  kind: "install";
  customer: string;
  seats: number;
}

export interface ModuleLicensePayload extends BaseLicensePayload {
  kind: "module";
  module: string;
}

export type AnyLicensePayload = InstallLicensePayload | ModuleLicensePayload;

// ─── Legacy payload (pre-Phase-0, kept for compatibility) ───────────────

export interface LicensePayload {
  install_id: string;
  company_name: string;
  tier: "basic" | "standard" | "business" | "enterprise";
  modules: string[];
  max_users: number;
  issued_at: number;
  expires_at: number | null;
  hard_expiry: boolean;
  key_id: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────

const b64url = (buf: Buffer | string) =>
  (typeof buf === "string" ? Buffer.from(buf) : buf)
    .toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

const b64urlDecode = (s: string) =>
  Buffer.from(s.replaceAll("-", "+").replaceAll("_", "/"), "base64");

function signPayloadWithKey(payloadObj: object, privatePem: string): string {
  const payloadB64 = b64url(JSON.stringify(payloadObj));
  const key = createPrivateKey(privatePem);
  const sig = edSign(null, Buffer.from(payloadB64), key);
  return `opsqai.v1.${payloadB64}.${b64url(sig)}`;
}

/** Split a compact token and verify signature against a public PEM. Pure. */
function splitAndVerify(token: string, publicPem: string): unknown | null {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "opsqai" || parts[1] !== "v1") return null;
  const [, , payloadB64, sigB64] = parts;
  try {
    const key = createPublicKey(publicPem);
    const ok = edVerify(null, Buffer.from(payloadB64), key, b64urlDecode(sigB64));
    if (!ok) return null;
    return JSON.parse(b64urlDecode(payloadB64).toString("utf-8"));
  } catch {
    return null;
  }
}

/** Extract `key_id` from a token without verifying the signature. */
export function peekTokenKeyId(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "opsqai" || parts[1] !== "v1") return null;
  try {
    const payload = JSON.parse(b64urlDecode(parts[2]).toString("utf-8")) as { key_id?: string };
    return typeof payload.key_id === "string" ? payload.key_id : null;
  } catch {
    return null;
  }
}

// ─── Signing key management ─────────────────────────────────────────────

/** Fetch the active signing keypair. Auto-generates one on first call. */
export async function getActiveSigningKey(): Promise<{ privatePem: string; publicPem: string; keyId: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing } = await supabaseAdmin
    .from("license_signing_keys")
    .select("private_key_pem, public_key_pem, key_id")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.private_key_pem) {
    return { privatePem: existing.private_key_pem, publicPem: existing.public_key_pem, keyId: existing.key_id };
  }

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const keyId = `ed25519-${randomUUID().slice(0, 8)}`;

  const { error } = await supabaseAdmin.from("license_signing_keys").insert({
    algorithm: "ed25519",
    private_key_pem: privatePem,
    public_key_pem: publicPem,
    key_id: keyId,
    active: true,
  });
  if (error) throw new Error(`Failed to persist signing key: ${error.message}`);

  return { privatePem, publicPem, keyId };
}

// ─── Legacy sign/verify (kept for backward compatibility) ───────────────

export async function signLicense(payload: Omit<LicensePayload, "key_id">): Promise<{ token: string; keyId: string }> {
  const { privatePem, keyId } = await getActiveSigningKey();
  const full: LicensePayload = { ...payload, key_id: keyId };
  return { token: signPayloadWithKey(full, privatePem), keyId };
}

export function verifyLicenseToken(token: string, publicPem: string): LicensePayload | null {
  return splitAndVerify(token, publicPem) as LicensePayload | null;
}

// ─── New typed sign functions (Phase 0) ─────────────────────────────────

export async function signInstallLicense(
  input: Omit<InstallLicensePayload, "license_version" | "kind" | "key_id">,
): Promise<{ token: string; keyId: string; payload: InstallLicensePayload }> {
  const { privatePem, keyId } = await getActiveSigningKey();
  const payload: InstallLicensePayload = {
    license_version: 1,
    kind: "install",
    key_id: keyId,
    ...input,
  };
  return { token: signPayloadWithKey(payload, privatePem), keyId, payload };
}

export async function signModuleLicense(
  input: Omit<ModuleLicensePayload, "license_version" | "kind" | "key_id">,
): Promise<{ token: string; keyId: string; payload: ModuleLicensePayload }> {
  const { privatePem, keyId } = await getActiveSigningKey();
  const payload: ModuleLicensePayload = {
    license_version: 1,
    kind: "module",
    key_id: keyId,
    ...input,
  };
  return { token: signPayloadWithKey(payload, privatePem), keyId, payload };
}

// ─── New typed verification (Phase 0) ───────────────────────────────────

export type VerifyReason =
  | "malformed"
  | "bad_signature"
  | "unknown_license_version"
  | "wrong_kind"
  | "expired"
  | "unknown_key_id"
  | "install_mismatch"
  | "revoked"
  | "suspended"
  | "not_found";

export type VerifyResult<P extends AnyLicensePayload> =
  | { ok: true; payload: P }
  | { ok: false; reason: VerifyReason; payload?: AnyLicensePayload };

/**
 * Pure typed verify — signature + license_version + kind + expiry.
 * Does NOT check revocation/suspension (that needs DB — see
 * verifyLicenseTokenFromDb).
 */
export function verifyLicenseTokenTyped<K extends LicenseKind>(
  token: string,
  publicPem: string,
  expectedKind: K,
  now: number = Math.floor(Date.now() / 1000),
): VerifyResult<K extends "install" ? InstallLicensePayload : ModuleLicensePayload> {
  const raw = splitAndVerify(token, publicPem);
  if (!raw || typeof raw !== "object") return { ok: false, reason: "bad_signature" };
  const p = raw as Partial<AnyLicensePayload>;
  if (p.license_version !== 1) return { ok: false, reason: "unknown_license_version" };
  if (p.kind !== expectedKind) return { ok: false, reason: "wrong_kind", payload: p as AnyLicensePayload };
  if (typeof p.expires_at === "number" && p.expires_at > 0 && p.expires_at < now) {
    return { ok: false, reason: "expired", payload: p as AnyLicensePayload };
  }
  return { ok: true, payload: p as never };
}

/**
 * DB-backed verify:
 *   1. Extract key_id from payload → resolve public PEM from
 *      `license_signing_keys` (all keys, not just active — supports rotation).
 *   2. Verify signature + license_version + kind + expiry.
 *   3. Cross-check `licenses` row: install_id match, not revoked.
 *      (Suspended check reserved for Phase 1 once the column exists.)
 */
export async function verifyLicenseTokenFromDb<K extends LicenseKind>(
  token: string,
  expectedKind: K,
  opts?: { expectedInstallId?: string; now?: number },
): Promise<VerifyResult<K extends "install" ? InstallLicensePayload : ModuleLicensePayload>> {
  const keyId = peekTokenKeyId(token);
  if (!keyId) return { ok: false, reason: "malformed" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: keyRow } = await supabaseAdmin
    .from("license_signing_keys")
    .select("public_key_pem, key_id")
    .eq("key_id", keyId)
    .maybeSingle();
  if (!keyRow?.public_key_pem) return { ok: false, reason: "unknown_key_id" };

  const pure = verifyLicenseTokenTyped(token, keyRow.public_key_pem, expectedKind, opts?.now);
  if (!pure.ok) return pure;

  const payload = pure.payload as AnyLicensePayload;

  if (opts?.expectedInstallId && payload.install_id !== opts.expectedInstallId) {
    return { ok: false, reason: "install_mismatch", payload };
  }

  // Cross-check DB row for revocation. Uses install_id + (module for module
  // tokens) to disambiguate once Phase 1 splits the schema; for now the
  // install_id + revoked flag is authoritative.
  const { data: row } = await supabaseAdmin
    .from("licenses")
    .select("install_id, revoked")
    .eq("install_id", payload.install_id)
    .maybeSingle();

  // Phase 0 policy: a matching license row that is revoked fails; the
  // absence of a row is not fatal (offline installs may verify tokens
  // before they land in MC's mirror). Phase 1 will tighten this.
  if (row && row.revoked === true) return { ok: false, reason: "revoked", payload };

  return pure;
}
