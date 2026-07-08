// Ed25519 license-token signing.
//
// Design:
// - License Server holds an Ed25519 keypair in `public.license_signing_keys`.
// - The PRIVATE key stays server-only (column-level GRANT excludes it from
//   `authenticated`; only service_role reads it).
// - Self-hosted OPSQAI installs verify tokens locally with the PUBLIC key,
//   fetched once during setup wizard from the License Server release feed.
//
// Token shape (compact "opsqai.v1"): base64url(payload) + "." + base64url(sig)

import { generateKeyPairSync, createPrivateKey, createPublicKey, sign as edSign, verify as edVerify, randomUUID } from "node:crypto";

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

const b64url = (buf: Buffer | string) =>
  (typeof buf === "string" ? Buffer.from(buf) : buf)
    .toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

const b64urlDecode = (s: string) =>
  Buffer.from(s.replaceAll("-", "+").replaceAll("_", "/"), "base64");

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

  // Generate fresh Ed25519 keypair
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

/** Sign a license payload → compact token. */
export async function signLicense(payload: Omit<LicensePayload, "key_id">): Promise<{ token: string; keyId: string }> {
  const { privatePem, keyId } = await getActiveSigningKey();
  const full: LicensePayload = { ...payload, key_id: keyId };
  const payloadB64 = b64url(JSON.stringify(full));
  const key = createPrivateKey(privatePem);
  const sig = edSign(null, Buffer.from(payloadB64), key);
  return { token: `opsqai.v1.${payloadB64}.${b64url(sig)}`, keyId };
}

/** Verify a compact token against a supplied public PEM. Returns payload or null. */
export function verifyLicenseToken(token: string, publicPem: string): LicensePayload | null {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "opsqai" || parts[1] !== "v1") return null;
  const [, , payloadB64, sigB64] = parts;
  try {
    const key = createPublicKey(publicPem);
    const ok = edVerify(null, Buffer.from(payloadB64), key, b64urlDecode(sigB64));
    if (!ok) return null;
    const payload = JSON.parse(b64urlDecode(payloadB64).toString("utf-8")) as LicensePayload;
    return payload;
  } catch {
    return null;
  }
}
