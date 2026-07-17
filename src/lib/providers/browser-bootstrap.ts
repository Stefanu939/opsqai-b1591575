// Browser-side provider bootstrap.
//
// Called once from `src/router.tsx` before the router mounts. Picks the
// Cloud or Self-Hosted `IBrowserAuthProvider` based on the resolved
// platform mode and registers it in the provider registry. Idempotent.
//
// Wave F introduces a resolve.alias that swaps
// `@/lib/providers/cloud/browser-auth` with a throw-stub in Self-Hosted
// builds so `@/integrations/supabase/client` never enters the bundle.
// Until then, both impls are statically importable — feature code still
// resolves the correct one at runtime via `getBrowserAuthProvider()`.

import { PlatformMode, getPlatformMode } from "@/lib/platform";
import { registerBrowserAuthProvider } from "@/lib/providers/registry";
import { createSupabaseBrowserAuthProvider } from "@/lib/providers/cloud/browser-auth";
import { createLocalBrowserAuthProvider } from "@/lib/providers/selfhost/local-browser-auth";

let booted = false;

export function bootstrapBrowserProviders(): void {
  if (booted) return;
  booted = true;
  const mode = getPlatformMode();
  const provider =
    mode === PlatformMode.SelfHosted
      ? createLocalBrowserAuthProvider()
      : createSupabaseBrowserAuthProvider();
  registerBrowserAuthProvider(provider);
}

/** Test-only. */
export function __resetBrowserBootstrapForTests(): void {
  booted = false;
}
