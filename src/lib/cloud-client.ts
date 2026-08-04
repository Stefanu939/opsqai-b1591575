// Cloud-only browser database accessor.
//
// In Self-Hosted builds every `@/integrations/supabase/*` module is aliased
// to a throwing stub (see `src/lib/providers/stubs/cloud-stub.ts`). Any
// static import + usage therefore crashes the UI. This helper is the single
// place where feature code may reach the Cloud browser client:
//
//   const db = await getCloudBrowserDb();
//   if (!db) return;            // Self-Hosted — feature is Cloud-only
//   await db.from("companies").select("name");
//
// The mode check happens BEFORE the dynamic import, so the stub module is
// never evaluated on Self-Hosted.

import { isCloud } from "@/lib/platform";

export async function getCloudBrowserDb() {
  if (!isCloud()) return null;
  const mod = await import("@/integrations/supabase/client");
  return mod.supabase;
}

/** Synchronous predicate for render-time gating of Cloud-only UI. */
export function cloudFeaturesEnabled(): boolean {
  return isCloud();
}
