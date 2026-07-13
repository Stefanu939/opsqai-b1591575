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

export interface LicenseRow {
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
 * Pure enforcement evaluator — no DB access. Deterministic and unit-testable.
 * Given the license rows for one install_id, decide whether `module_key` is unlocked.
 */
export function evaluateModuleAccess(
  rows: LicenseRow[],
  install_id: string,
  module_key: string,
  now: Date = new Date(),
): EnforcementResult {
  if (!isValidModuleKey(module_key)) {
    return { ok: false, reason: "unknown_module", install_id, module_key: module_key as ModuleKey };
  }
  const mk = module_key as ModuleKey;

  const install = rows.find((r) => r.kind === "install");
  if (!install) return { ok: false, reason: "no_install_license", install_id, module_key: mk };
  if (install.revoked) return { ok: false, reason: "install_revoked", install_id, module_key: mk };
  if (install.suspended)
    return { ok: false, reason: "install_suspended", install_id, module_key: mk };
  if (isExpired(install, now))
    return { ok: false, reason: "install_expired", install_id, module_key: mk };

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
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("licenses")
    .select("kind, module_key, revoked, suspended, expires_at")
    .eq("install_id", install_id);

  if (error) throw new Error(error.message);
  return evaluateModuleAccess((data ?? []) as LicenseRow[], install_id, module_key, now);
}

/**
 * Structured 403 for license denials. Thrown as a `Response` so the
 * TanStack Start server-fn RPC pipes it out as a real HTTP 403 with a
 * machine-readable body — the client can render an accurate "renew" /
 * "upgrade" message per reason instead of a generic error.
 */
export class LicenseDeniedError extends Error {
  constructor(
    public readonly reason: EnforcementDenyReason,
    public readonly module_key: string,
  ) {
    super(`license_denied:${reason}:${module_key}`);
    this.name = "LicenseDeniedError";
  }
  toResponse(): Response {
    return new Response(
      JSON.stringify({ error: "license_denied", reason: this.reason, module: this.module_key }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
}

/** Throwing variant for use inside server-fn handlers (throws HTTP 403 Response). */
export async function assertModule(install_id: string, module_key: string): Promise<void> {
  const res = await requireModule(install_id, module_key);
  if (!res.ok) {
    const err = new LicenseDeniedError(res.reason ?? "unknown_module", module_key);
    throw err.toResponse();
  }
}

/**
 * Per-company variant: resolves the current company's install_id via the
 * `companies.install_id` bridge, then delegates to `assertModule`. A company
 * with no `install_id` set is treated as `no_install_license` (hard deny).
 */
export async function assertModuleForCompany(
  companyId: string,
  module_key: string,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("install_id")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const install_id = (data as { install_id: string | null } | null)?.install_id ?? null;
  if (!install_id) {
    throw new LicenseDeniedError("no_install_license", module_key).toResponse();
  }
  await assertModule(install_id, module_key);
}
