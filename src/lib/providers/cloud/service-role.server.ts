// Cloud-only. Service-role Supabase client for Cloud-managed integration
// surfaces (auth email webhook, transactional email queue, unsubscribe,
// contact webhook). Living under `@/lib/providers/cloud/*` means Wave D's
// Vite alias plugin rewrites every import of this module to
// `src/lib/providers/stubs/cloud-stub.ts` in Self-Hosted builds, so
// neither the Supabase project URL nor the service-role env name reach
// the Self-Hosted bundle. On Cloud, this is imported dynamically from
// handler bodies so the reference is code-split into its own chunk.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Build a service-role Supabase client. Reads env at call time — never at
 * module scope — so `process.env.*` resolves inside the server-fn / route
 * handler, not during import graph evaluation.
 *
 * Throws when either env var is missing so callers can return a clean 500.
 */
export function createServiceRoleClient(): SupabaseClient<any, any> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("cloud_service_role_client_misconfigured");
  }
  return createClient(url, key);
}

/** Cloud-only: expose the raw service-role key for Bearer-token comparisons. */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("cloud_service_role_key_missing");
  return key;
}
