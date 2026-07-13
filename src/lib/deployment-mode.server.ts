// Phase 7 hardening (High #8) — server-side mode enforcement.
//
// `deployment-mode.ts` decides route visibility in the browser. That gate
// is user-defense-in-depth only. Every mode-scoped server function MUST
// call `assertMode(...)` at the top of its handler so a crafted request
// cannot invoke MC-only logic on a self-host install (or vice versa).
//
// The active mode is read from `process.env.OPSQAI_MODE`, defaulting to
// "mc" for the hosted deployment.

import type { DeploymentMode } from "./deployment-mode";

export function currentServerMode(): DeploymentMode {
  const raw = process.env.OPSQAI_MODE;
  if (raw === "selfhost" || raw === "mc") return raw;
  return "mc";
}

export class ModeAssertionError extends Error {
  constructor(
    public expected: DeploymentMode,
    public actual: DeploymentMode,
  ) {
    super(`Operation requires OPSQAI_MODE="${expected}" but current mode is "${actual}"`);
    this.name = "ModeAssertionError";
  }
}

/**
 * Guard invoked at the top of every mode-scoped server function.
 * Throws when the running deployment mode doesn't match the requirement.
 *
 *   assertMode("mc");        // MC-only endpoint
 *   assertMode("selfhost");  // self-host-only endpoint
 */
export function assertMode(expected: DeploymentMode): void {
  const actual = currentServerMode();
  if (actual !== expected) {
    throw new ModeAssertionError(expected, actual);
  }
}
