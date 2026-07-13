// Phase 5.5 — Bootstrap Recovery Token.
//
// A Bootstrap Recovery Token is issued by the Management Center to unlock
// recovery mode on a Self-Hosted install when the customer has lost their
// break-glass secret. It is:
//   - Ed25519-signed with the same signing keyset used for licenses.
//   - Bound to a specific install_id + short expiry (default 24h) + nonce.
//   - Envelope-versioned: `opsqai-dr.v1.<payloadB64>.<sigB64>`.
//   - Payload-versioned: `dr_version: 1`.
//   - Audited MC-side in `dr_bootstrap_tokens`.
//
// Self-hosted verify uses the pinned public PEM the install already trusts
// for license verification — no new key material.

import {
  createPrivateKey,
  createPublicKey,
  sign as edSign,
  verify as edVerify,
  randomUUID,
} from "node:crypto";
import { getActiveSigningKey } from "@/lib/license-signing.server";

export interface DrBootstrapPayload {
  dr_version: 1;
  kind: "dr_bootstrap";
  install_id: string;
  nonce: string;
  key_id: string;
  issued_at: number;
  expires_at: number;
  reason?: string | null;
}

const b64url = (buf: Buffer | string) =>
  (typeof buf === "string" ? Buffer.from(buf) : buf)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

const b64urlDecode = (s: string) =>
  Buffer.from(s.replaceAll("-", "+").replaceAll("_", "/"), "base64");

/** Sign a Bootstrap Recovery Token. Returns the compact token + payload. */
export async function signBootstrapToken(input: {
  install_id: string;
  ttl_seconds?: number;
  reason?: string | null;
}): Promise<{ token: string; payload: DrBootstrapPayload }> {
  const { privatePem, keyId } = await getActiveSigningKey();
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.max(60, Math.min(input.ttl_seconds ?? 24 * 3600, 7 * 24 * 3600));
  const payload: DrBootstrapPayload = {
    dr_version: 1,
    kind: "dr_bootstrap",
    install_id: input.install_id,
    nonce: randomUUID(),
    key_id: keyId,
    issued_at: now,
    expires_at: now + ttl,
    reason: input.reason ?? null,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = edSign(null, Buffer.from(payloadB64), createPrivateKey(privatePem));
  return { token: `opsqai-dr.v1.${payloadB64}.${b64url(sig)}`, payload };
}

export type DrVerifyReason =
  | "malformed"
  | "bad_signature"
  | "unknown_dr_version"
  | "wrong_kind"
  | "expired"
  | "install_mismatch";

export type DrVerifyResult =
  | { ok: true; payload: DrBootstrapPayload }
  | { ok: false; reason: DrVerifyReason; payload?: DrBootstrapPayload };

/** Peek key_id without verifying. */
export function peekBootstrapKeyId(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "opsqai-dr" || parts[1] !== "v1") return null;
  try {
    const p = JSON.parse(b64urlDecode(parts[2]).toString("utf-8")) as { key_id?: string };
    return typeof p.key_id === "string" ? p.key_id : null;
  } catch {
    return null;
  }
}

/** Pure verify against a pinned public PEM. */
export function verifyBootstrapToken(
  token: string,
  publicPem: string,
  opts: { expectedInstallId: string; now?: number },
): DrVerifyResult {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "opsqai-dr" || parts[1] !== "v1") {
    return { ok: false, reason: "malformed" };
  }
  const [, , payloadB64, sigB64] = parts;
  let raw: unknown;
  try {
    const key = createPublicKey(publicPem);
    const ok = edVerify(null, Buffer.from(payloadB64), key, b64urlDecode(sigB64));
    if (!ok) return { ok: false, reason: "bad_signature" };
    raw = JSON.parse(b64urlDecode(payloadB64).toString("utf-8"));
  } catch {
    return { ok: false, reason: "bad_signature" };
  }
  const p = raw as Partial<DrBootstrapPayload>;
  if (p.dr_version !== 1) return { ok: false, reason: "unknown_dr_version" };
  if (p.kind !== "dr_bootstrap") return { ok: false, reason: "wrong_kind" };
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  if (typeof p.expires_at !== "number" || p.expires_at < now) {
    return { ok: false, reason: "expired", payload: p as DrBootstrapPayload };
  }
  if (p.install_id !== opts.expectedInstallId) {
    return { ok: false, reason: "install_mismatch", payload: p as DrBootstrapPayload };
  }
  return { ok: true, payload: p as DrBootstrapPayload };
}
