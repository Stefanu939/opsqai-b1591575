// Central license enforcement.
//
// A capability is accessible on an install if and only if:
//   1. The install has a valid, non-revoked, non-suspended Installation
//      License, AND
//   2. Either the capability is CORE (part of the OPSQAI platform and never
//      commercialized — see `product-architecture.ts`), OR the install has a
//      valid, non-revoked, non-suspended license row for that product /
//      add-on key.
//
// Core is never deniable by module licensing; it is still RBAC-gated
// elsewhere (`module-access.ts`). Products and add-ons always require an
// explicit entitlement.
//
// This is the ONLY place that decides "is this unlocked?". All server
// functions that gate a product/add-on MUST route through `requireModule`.

import { isValidModuleKey, type ModuleKey } from "@/lib/license-modules";
import { CORE_CAPABILITY_KEYS, classifyLegacy } from "@/lib/product-architecture";


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

  // Core platform capabilities are included in OPSQAI — a valid install
  // license is all they require.
  if (
    (CORE_CAPABILITY_KEYS as readonly string[]).includes(mk) ||
    classifyLegacy(mk) === "core"
  ) {

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
 * Self-Hosted enforcement source: the offline licensing provider (signed
 * install/module tokens on the local machine). NEVER touches a Cloud client.
 */
async function selfHostLicenseRows(): Promise<{ rows: LicenseRow[]; installId: string | null }> {
  const { getLicensingProvider } = await import("@/lib/providers/registry");
  const ent = await getLicensingProvider().entitlements();
  const iso = (secs: number | null) => (secs ? new Date(secs * 1000).toISOString() : null);
  if (!ent.installId) return { rows: [], installId: null };
  const rows: LicenseRow[] = [
    {
      kind: "install",
      module_key: null,
      revoked: ent.revoked,
      suspended: false,
      expires_at: ent.unlimited ? null : iso(ent.expiresAt),
    },
    ...ent.modules.map((m) => ({
      kind: "module" as const,
      module_key: m,
      revoked: false,
      suspended: false,
      expires_at: null,
    })),
  ];
  return { rows, installId: ent.installId };
}

/**
 * Server-side enforcement check. On Cloud it uses the admin client because
 * enforcement runs regardless of the caller's role and must never be
 * short-circuited by RLS; on Self-Hosted it reads the locally verified
 * license set. Callers should treat `ok: false` as a hard deny.
 */
export async function requireModule(
  install_id: string,
  module_key: string,
  now: Date = new Date(),
): Promise<EnforcementResult> {
  const { isSelfHostedRuntime } = await import("@/lib/ai-adapters/registry");
  if (isSelfHostedRuntime()) {
    const { rows, installId } = await selfHostLicenseRows();
    return evaluateModuleAccess(rows, installId ?? install_id, module_key, now);
  }

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
  const { isSelfHostedRuntime } = await import("@/lib/ai-adapters/registry");
  if (isSelfHostedRuntime()) {
    // Self-Hosted has exactly one installation; the company bridge is
    // irrelevant and the Cloud client must never be reached from here.
    const res = await requireModule("", module_key);
    if (!res.ok) {
      throw new LicenseDeniedError(res.reason ?? "unknown_module", module_key).toResponse();
    }
    return;
  }

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

