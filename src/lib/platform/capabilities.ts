// Capability registry.
//
// Providers advertise capabilities at boot; feature code queries the
// registry instead of branching on PlatformMode. This is the mechanism
// that keeps the "shared business logic, independent infrastructure"
// rule enforceable.

import { Capability } from "./types";

const active = new Set<Capability>();

/**
 * Register a capability as available in the current runtime.
 *
 * Called by provider bootstrap during application boot (see
 * `src/lib/platform/bootstrap.ts`). Idempotent.
 */
export function registerCapability(capability: Capability): void {
  active.add(capability);
}

/**
 * Register several capabilities at once. Idempotent.
 */
export function registerCapabilities(capabilities: readonly Capability[]): void {
  for (const c of capabilities) active.add(c);
}

/**
 * Remove a capability. Only used by tests and by provider swaps during
 * live reconfiguration (e.g. user configures AI after "Configure Later").
 */
export function unregisterCapability(capability: Capability): void {
  active.delete(capability);
}

/**
 * Query whether a capability is available in the current runtime.
 *
 * Prefer this over `mode === PlatformMode.Cloud`. Example:
 *
 *   if (hasCapability(Capability.SSO)) { renderSsoButton(); }
 */
export function hasCapability(capability: Capability): boolean {
  return active.has(capability);
}

/**
 * Snapshot of active capabilities. Intended for the health check and
 * OPSQAI Doctor reports — do not use it for feature gates (use
 * `hasCapability` so intent stays readable).
 */
export function listActiveCapabilities(): Capability[] {
  return [...active].sort();
}

/**
 * Test-only reset. Not exported from the public barrel.
 */
export function __resetCapabilitiesForTests(): void {
  active.clear();
}
