// Edition resolution.
//
// The active Edition is set once after the license has been validated
// (Cloud reads it from the subscription record, Self-Hosted from the
// signed license token loaded at install). Feature gates use this
// value together with Capability queries.

import { Edition } from "./types";

let activeEdition: Edition = Edition.Community;

/**
 * Set the active edition. Called by the licensing provider once the
 * license has been validated. Never called from feature code.
 */
export function setActiveEdition(edition: Edition): void {
  activeEdition = edition;
}

/**
 * Read the active edition. Defaults to Community until the licensing
 * provider has finished validating (safe fallback — Community is the
 * least-privileged tier).
 */
export function getActiveEdition(): Edition {
  return activeEdition;
}

/**
 * True when the active edition is at least `minimum`. Ordering:
 * Community < Professional < Enterprise.
 */
export function atLeastEdition(minimum: Edition): boolean {
  const rank: Record<Edition, number> = {
    [Edition.Community]: 0,
    [Edition.Professional]: 1,
    [Edition.Enterprise]: 2,
  };
  return rank[activeEdition] >= rank[minimum];
}

/**
 * Test-only reset. Not exported from the public barrel.
 */
export function __resetEditionForTests(): void {
  activeEdition = Edition.Community;
}
