// Phase 4 / 6.5 — Shared activation-bundle builder.
//
// Callers (Management Center exporter, Customer Portal downloader) both
// need the same bundle shape. Auth is the caller's responsibility.

import { createPrivateKey, sign as edSign } from "node:crypto";
import type { ActivationBundle } from "@/lib/license-activation.functions";

const b64urlBundle = (buf: Buffer | string) =>
  (typeof buf === "string" ? Buffer.from(buf) : buf)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

/** Sign an activation bundle as a compact JWS/JWT (EdDSA). */
export async function signBundleAsJwt(bundle: ActivationBundle): Promise<string> {
  const { getActiveSigningKey } = await import("@/lib/license-signing.server");
  const { privatePem, keyId } = await getActiveSigningKey();
  const header = { alg: "EdDSA", typ: "JWT", kid: keyId, cty: "opsqai-activation-bundle+json" };
  const headerB64 = b64urlBundle(JSON.stringify(header));
  const payloadB64 = b64urlBundle(JSON.stringify(bundle));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = edSign(null, Buffer.from(signingInput), createPrivateKey(privatePem));
  return `${signingInput}.${b64urlBundle(sig)}`;
}


export async function buildActivationBundle(install_id: string): Promise<ActivationBundle> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("licenses")
    .select("kind, module_key, signed_token, revoked")
    .eq("install_id", install_id);
  if (error) throw new Error(error.message);

  const install = (rows ?? []).find((r) => r.kind === "install" && !r.revoked);
  if (!install?.signed_token) throw new Error("No active Installation License for this install_id");

  const modules = (rows ?? [])
    .filter((r) => r.kind === "module" && !r.revoked && r.module_key && r.signed_token)
    .map((r) => ({ module_key: r.module_key as string, signed_token: r.signed_token as string }));

  const { getActiveSigningKey } = await import("@/lib/license-signing.server");
  const { buildAndSignCrl } = await import("@/lib/license-crl.server");
  const key = await getActiveSigningKey();
  const { token: crlToken } = await buildAndSignCrl();

  return {
    bundle_version: 1,
    install_id,
    public_key_pem: key.publicPem,
    key_id: key.keyId,
    install_token: install.signed_token as string,
    module_tokens: modules,
    crl_token: crlToken,
    issued_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Single-module license bundle. Same envelope shape as buildActivationBundle,
 * but `module_tokens` contains only the requested module. Consumed by the
 * offline importer to apply a single module without re-issuing every token.
 */
export async function buildModuleLicenseBundle(
  install_id: string,
  module_key: string,
): Promise<ActivationBundle> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("licenses")
    .select("kind, module_key, signed_token, revoked")
    .eq("install_id", install_id);
  if (error) throw new Error(error.message);

  const install = (rows ?? []).find((r) => r.kind === "install" && !r.revoked);
  if (!install?.signed_token) throw new Error("No active Installation License for this install_id");

  const mod = (rows ?? []).find(
    (r) => r.kind === "module" && r.module_key === module_key && !r.revoked,
  );
  if (!mod?.signed_token) throw new Error(`No active license for module "${module_key}"`);

  const { getActiveSigningKey } = await import("@/lib/license-signing.server");
  const { buildAndSignCrl } = await import("@/lib/license-crl.server");
  const key = await getActiveSigningKey();
  const { token: crlToken } = await buildAndSignCrl();

  return {
    bundle_version: 1,
    install_id,
    public_key_pem: key.publicPem,
    key_id: key.keyId,
    install_token: install.signed_token as string,
    module_tokens: [{ module_key, signed_token: mod.signed_token as string }],
    crl_token: crlToken,
    issued_at: Math.floor(Date.now() / 1000),
  };
}
