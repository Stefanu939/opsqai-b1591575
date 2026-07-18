// Server-side provider bootstrap.
//
// Called once from a server middleware in `src/start.ts` before any
// server function handler runs. Picks the Cloud or Self-Hosted
// bootstrap based on the resolved platform mode. Idempotent — safe to
// call on every request.

import { PlatformMode, getPlatformMode } from "@/lib/platform";

let booted = false;
let pending: Promise<void> | null = null;

async function boot(): Promise<void> {
  const mode = getPlatformMode();
  if (mode === PlatformMode.SelfHosted) {
    const { bootstrapSelfHosted } = await import(
      "@/lib/providers/selfhost/bootstrap-selfhost.server"
    );
    await bootstrapSelfHosted();
  } else {
    const { bootstrapCloud } = await import(
      "@/lib/providers/cloud/bootstrap-cloud.server"
    );
    bootstrapCloud();
  }
}

export function ensureServerProviders(): Promise<void> {
  if (booted) return Promise.resolve();
  if (!pending) {
    pending = boot().then(
      () => {
        booted = true;
      },
      (err) => {
        pending = null;
        throw err;
      },
    );
  }
  return pending;
}
