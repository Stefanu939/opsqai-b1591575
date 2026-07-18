// Shared helper for Cloud-only server functions.
//
// Every server function in the OPSQAI codebase runs on both the MC (Cloud)
// and Self-Hosted deployments, because the two products share one build.
// A handful of feature areas — MC console, workspace, portal admin,
// support, releases, license management, DR, etc. — only make sense on
// Cloud. On Self-Hosted their tables don't exist and the diagnostic Proxy
// from `require-auth.ts` throws with an implementation-detail message.
//
// `getCloudSupabase` replaces `context.supabase` inside those handlers so
// they still work verbatim on Cloud but fail with a clean, actionable
// error on Self-Hosted BEFORE any query runs.

import { PlatformMode, getPlatformMode } from "@/lib/platform";

export class FeatureNotAvailableError extends Error {
  readonly code = "FEATURE_NOT_AVAILABLE_SELFHOST";
  readonly feature: string;
  constructor(feature: string) {
    super(`Feature "${feature}" is not available on Self-Hosted.`);
    this.name = "FeatureNotAvailableError";
    this.feature = feature;
  }
}

export function notAvailable(feature: string): never {
  throw new FeatureNotAvailableError(feature);
}

/**
 * Returns `context.supabase` on Cloud. On Self-Hosted, throws
 * `FeatureNotAvailableError(feature)`.
 *
 * Use inside `createServerFn().middleware([requireAuth]).handler(...)`:
 *
 *     const db = getCloudSupabase(context, "workspace");
 *     const { data } = await db.from("workspace_files").select("*");
 */
export function getCloudSupabase<T>(
  context: { supabase: T; edition?: string },
  feature: string,
): T {
  if (getPlatformMode() !== PlatformMode.Cloud) notAvailable(feature);
  return context.supabase;
}

/**
 * Cloud-only service-role client accessor. On SH, throws
 * `FeatureNotAvailableError` before touching any Supabase module. Confines
 * the `@/integrations/supabase/client.server` import to a single
 * Cloud-gated location so SH bundles never reach it via app code.
 *
 * Use inside `.handler(...)`:
 *
 *     const admin = await getCloudSupabaseAdmin("mc-admin");
 *     await admin.from("companies").select("*");
 */
export async function getCloudSupabaseAdmin(feature: string) {
  if (getPlatformMode() !== PlatformMode.Cloud) notAvailable(feature);
  const mod = await import("@/integrations/supabase/client.server");
  return mod.supabaseAdmin;
}

