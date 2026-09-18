// Read-only grace for an expired Self-Hosted licence.
//
// When a pilot or subscription licence lapses the installation must not go
// dark: the customer keeps reading, searching and exporting their own data,
// while anything that creates or changes a record is refused until the
// licence is extended or moved to production. This module is the single
// place that decides "is this a write, and are writes currently allowed".

import { getLicensingProvider } from "@/lib/providers/registry";

/** Permission suffixes that change data. Everything else is a read. */
const MUTATING_SUFFIXES = [
  "create",
  "edit",
  "update",
  "delete",
  "approve",
  "manage",
  "assign",
  "administer",
  "issue",
  "revoke",
];

export function isMutatingPermission(permission: string): boolean {
  const suffix = permission.includes(".") ? permission.split(".").pop()! : permission;
  return MUTATING_SUFFIXES.includes(suffix);
}

let cached: { readOnly: boolean; at: number } | null = null;
const TTL_MS = 60_000;

/**
 * True when the installation's licence has expired. Cached for a minute so a
 * permission check never turns into a filesystem read per call. Fail-open:
 * an unreadable licensing provider never blocks writes.
 */
export async function isLicenseReadOnly(): Promise<boolean> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.readOnly;
  let readOnly = false;
  try {
    const ent = await getLicensingProvider().entitlements();
    readOnly = ent.status === "expired";
  } catch {
    readOnly = false;
  }
  cached = { readOnly, at: Date.now() };
  return readOnly;
}

/** Tests and licence activation clear the cache so the new state is immediate. */
export function resetLicenseReadOnlyCache(): void {
  cached = null;
}
