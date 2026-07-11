// Phase 4 / 6.5 — Shared activation-bundle builder.
//
// Callers (Management Center exporter, Customer Portal downloader) both
// need the same bundle shape. Auth is the caller's responsibility.

import type { ActivationBundle } from "@/lib/license-activation.functions";

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
