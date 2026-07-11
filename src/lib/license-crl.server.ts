// Signed Certificate Revocation List (Phase 4).
//
// The Management Center periodically exports a signed CRL. Self-hosted
// installs — including air-gapped ones that never reach MC directly — can
// import the CRL offline to learn which Installation / Module licenses have
// been revoked or suspended.
//
// Envelope: `opsqai-crl.v1.<payloadB64>.<sigB64>` (Ed25519, same key as
// license tokens, so installs verify with the same public PEM they already
// pinned during Setup Wizard).

import { createPrivateKey, createPublicKey, sign as edSign, verify as edVerify } from "node:crypto";

export interface CrlEntry {
  install_id: string;
  kind: "install" | "module";
  module_key: string | null;
  revoked: boolean;
  suspended: boolean;
  revoked_at: string | null;
  suspended_at: string | null;
}

export interface CrlPayload {
  crl_version: 1;
  key_id: string;
  issued_at: number; // unix seconds
  entries: CrlEntry[];
}

const b64url = (buf: Buffer | string) =>
  (typeof buf === "string" ? Buffer.from(buf) : buf)
    .toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

const b64urlDecode = (s: string) =>
  Buffer.from(s.replaceAll("-", "+").replaceAll("_", "/"), "base64");

export function signCrl(payload: CrlPayload, privatePem: string): string {
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = edSign(null, Buffer.from(payloadB64), createPrivateKey(privatePem));
  return `opsqai-crl.v1.${payloadB64}.${b64url(sig)}`;
}

export type CrlVerifyReason =
  | "malformed"
  | "bad_signature"
  | "unknown_crl_version";

export type CrlVerifyResult =
  | { ok: true; payload: CrlPayload }
  | { ok: false; reason: CrlVerifyReason };

export function verifyCrl(token: string, publicPem: string): CrlVerifyResult {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "opsqai-crl" || parts[1] !== "v1") {
    return { ok: false, reason: "malformed" };
  }
  const [, , payloadB64, sigB64] = parts;
  try {
    const ok = edVerify(null, Buffer.from(payloadB64), createPublicKey(publicPem), b64urlDecode(sigB64));
    if (!ok) return { ok: false, reason: "bad_signature" };
    const payload = JSON.parse(b64urlDecode(payloadB64).toString("utf-8")) as Partial<CrlPayload>;
    if (payload.crl_version !== 1) return { ok: false, reason: "unknown_crl_version" };
    return { ok: true, payload: payload as CrlPayload };
  } catch {
    return { ok: false, reason: "bad_signature" };
  }
}

/** Peek key_id without verifying — used by installs to pick the right pinned PEM. */
export function peekCrlKeyId(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "opsqai-crl" || parts[1] !== "v1") return null;
  try {
    const p = JSON.parse(b64urlDecode(parts[2]).toString("utf-8")) as { key_id?: string };
    return typeof p.key_id === "string" ? p.key_id : null;
  } catch {
    return null;
  }
}

/**
 * Build and sign a fresh CRL from the MC `licenses` table.
 * Includes every row where `revoked` OR `suspended` is true.
 */
export async function buildAndSignCrl(): Promise<{ token: string; payload: CrlPayload }> {
  const { getActiveSigningKey } = await import("@/lib/license-signing.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { privatePem, keyId } = await getActiveSigningKey();

  const { data, error } = await supabaseAdmin
    .from("licenses")
    .select("install_id, kind, module_key, revoked, suspended, revoked_at, suspended_at")
    .or("revoked.eq.true,suspended.eq.true");
  if (error) throw new Error(error.message);

  const entries: CrlEntry[] = (data ?? []).map((r) => ({
    install_id: r.install_id,
    kind: (r.kind ?? "install") as "install" | "module",
    module_key: r.module_key ?? null,
    revoked: !!r.revoked,
    suspended: !!r.suspended,
    revoked_at: r.revoked_at ?? null,
    suspended_at: r.suspended_at ?? null,
  }));

  const payload: CrlPayload = {
    crl_version: 1,
    key_id: keyId,
    issued_at: Math.floor(Date.now() / 1000),
    entries,
  };

  return { token: signCrl(payload, privatePem), payload };
}
