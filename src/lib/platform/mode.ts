// PlatformMode + DeploymentType resolution.
//
// The runtime mode is decided once at boot and cached. All resolution
// prefers the injected window global (set by the Self-Hosted bootstrap
// script) over Vite env vars, so a built Self-Hosted bundle running
// against localhost is never mistaken for Cloud.
//
// Legacy code still imports `getClientDeploymentMode()` from
// `src/lib/deployment-mode.ts`; that helper stays as a compatibility
// shim and internally delegates here in a follow-up slice.

import { DeploymentType, PlatformMode } from "./types";

let cachedMode: PlatformMode | null = null;
let cachedDeployment: DeploymentType | null = null;

function readRawMode(): string | undefined {
  if (typeof window !== "undefined") {
    const injected = (window as unknown as { __OPSQAI_MODE__?: string }).__OPSQAI_MODE__;
    if (injected) return injected;
  }
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return viteEnv?.VITE_OPSQAI_MODE;
}

/**
 * Resolve the current PlatformMode. Cached after first call. Falls back
 * to Cloud so the hosted product keeps working even without an explicit
 * env var — Self-Hosted always injects the window global at boot.
 */
export function getPlatformMode(): PlatformMode {
  if (cachedMode) return cachedMode;
  const raw = readRawMode();
  cachedMode =
    raw === "selfhost" || raw === "self-hosted"
      ? PlatformMode.SelfHosted
      : PlatformMode.Cloud;
  return cachedMode;
}

/**
 * Resolve the current DeploymentType. Today it mirrors PlatformMode; a
 * future Hybrid distribution would override this via a build flag.
 */
export function getDeploymentType(): DeploymentType {
  if (cachedDeployment) return cachedDeployment;
  cachedDeployment =
    getPlatformMode() === PlatformMode.SelfHosted
      ? DeploymentType.SelfHosted
      : DeploymentType.Cloud;
  return cachedDeployment;
}

/**
 * Convenience predicate. Prefer capability queries over this — use it
 * only where the distinction is genuinely about infrastructure (e.g.
 * the license activation flow, which only exists on Self-Hosted).
 */
export function isSelfHosted(): boolean {
  return getPlatformMode() === PlatformMode.SelfHosted;
}

export function isCloud(): boolean {
  return getPlatformMode() === PlatformMode.Cloud;
}

/**
 * Test-only reset. Not exported from the public barrel.
 */
export function __resetPlatformModeForTests(): void {
  cachedMode = null;
  cachedDeployment = null;
}
