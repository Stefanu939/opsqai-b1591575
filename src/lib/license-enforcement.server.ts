// Central license enforcement (Phase 1).
//
// A module is accessible on an install if and only if:
//   1. The install has a valid, non-revoked, non-suspended Installation License, AND
//   2. Either the module is in the Basic bundle, OR the install has a
//      valid, non-revoked, non-suspended Module License for that module.
//
// This is the ONLY place that decides "is this module unlocked?". All
// server functions that gate a paid module MUST route through
// `requireModule` — no ad-hoc reads of the licenses table for enforcement.

import { BASIC_MODULES, isValidModuleKey, type ModuleKey } from "@/lib/license-modules";

export type EnforcementDenyReason =
  | "unknown_module"
  | "no_install_license"
  | "install_revoked"
  | "install_suspended"
  | "install_expired"
  | "no_module_license"
  | "module_revoked"
  | "module_suspended"
  | "module_expired";

export interface EnforcementResult {
  ok: boolean;
  reason?: EnforcementDenyReason;
  install_id: string;
  module_key: ModuleKey;
}

interface LicenseRow {
  kind: "install" | "module";
  module_key: string | null;
  revoked: boolean;
  suspended: boolean;
  expires_at: string | null;
}

function isExpired(row: Pick<LicenseRow, "expires_at">, now: Date): boolean {
  if (!row.expires_at) return false;
  return new Date(row.expires_at).getTime() < now.getTime();
}

/**
 * Server-side enforcement check. Uses the admin client because enforcement
 * runs regardless of the caller's role and must never be short-circuited by
 * RLS. Callers should treat `ok: false` as a hard deny.
 */
export async function requireModule(
  install_id: string,
  module_key: string,
  now: Date = new Date(),
): Promise<EnforcementResult> {
  if (!isValidModuleKey(module_key)) {
    return { ok: false, reason: "unknown_module", install_id, module_key: module_key as ModuleKey };
  }
  const mk = module_key as ModuleKey;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("licenses")
    .select("kind, module_key, revoked, suspended, expires_at")
    .eq("install_id", install_id);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as LicenseRow[];

  const install = rows.find((r) => r.kind === "install");
  if (!install) return { ok: false, reason: "no_install_license", install_id, module_key: mk };
  if (install.revoked) return { ok: false, reason: "install_revoked", install_id, module_key: mk };
  if (install.suspended) return { ok: false, reason: "install_suspended", install_id, module_key: mk };
  if (isExpired(install, now)) return { ok: false, reason: "install_expired", install_id, module_key: mk };

  // Basic modules only require a valid Installation License.
  if ((BASIC_MODULES as readonly string[]).includes(mk)) {
    return { ok: true, install_id, module_key: mk };
  }

  const mod = rows.find((r) => r.kind === "module" && r.module_key === mk);
  if (!mod) return { ok: false, reason: "no_module_license", install_id, module_key: mk };
  if (mod.revoked) return { ok: false, reason: "module_revoked", install_id, module_key: mk };
  if (mod.suspended) return { ok: false, reason: "module_suspended", install_id, module_key: mk };
  if (isExpired(mod, now)) return { ok: false, reason: "module_expired", install_id, module_key: mk };

  return { ok: true, install_id, module_key: mk };
}

/** Throwing variant for use inside server-fn handlers. */
export async function assertModule(install_id: string, module_key: string): Promise<void> {
  const res = await requireModule(install_id, module_key);
  if (!res.ok) {
    throw new Error(`license_denied:${res.reason}:${module_key}`);
  }
}
