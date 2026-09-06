// Client-safe module-access resolution.
//
// Maps OPSQAI roles (new model: superadmin/admin/manager/employee, plus
// legacy DB role names) to the set of ModuleKeys a user can see/use. This
// file must stay free of server-only imports so it can be shared by UI
// code and server functions alike.

import { BASIC_MODULES, LICENSE_MODULE_CATALOG, type ModuleKey } from "@/lib/license-modules";

export type AppRole = "superadmin" | "admin" | "manager" | "employee";

/**
 * Legacy DB role names (still present in `user_roles.role` / `app_role`)
 * mapped onto the nearest new role. `platform_owner` / `platform_admin`
 * are OPSQAI-internal platform roles and are treated as `superadmin` for
 * module-access purposes only (their actual platform permissions are
 * unaffected — this mapping is purely for module gating).
 */
export const LEGACY_ROLE_MAP: Record<string, AppRole> = {
  superadmin: "superadmin",
  platform_owner: "superadmin",
  platform_admin: "superadmin",
  admin: "admin",
  workspace_owner: "admin",
  manager: "manager",
  supervisor: "manager",
  team_leader: "manager",
  employee: "employee",
  operator: "employee",
  viewer: "employee",
};

export function normalizeAppRole(role: string | null | undefined): AppRole {
  if (!role) return "employee";
  return LEGACY_ROLE_MAP[role] ?? "employee";
}

const ALL_MODULE_KEYS: ModuleKey[] = LICENSE_MODULE_CATALOG.map((m) => m.key);

/** Default modules visible to each role before any explicit override / license intersection. */
export const ROLE_MODULE_PRESETS: Record<AppRole, ModuleKey[]> = {
  superadmin: ALL_MODULE_KEYS,
  admin: ALL_MODULE_KEYS,
  manager: Array.from(
    new Set<ModuleKey>([
      ...BASIC_MODULES,
      "analytics",
      "reports",
      "knowledge_gaps",
      "internal_requests",
      "workspace_health",
      "audit_log",
    ]),
  ),
  employee: Array.from(new Set<ModuleKey>([...BASIC_MODULES])),
};

export interface ResolveAccessibleModulesInput {
  role: string | null | undefined;
  /** Explicit per-user module grants (e.g. from `user_module_access`); undefined = "not customized". */
  explicit?: ModuleKey[] | null;
  /** Modules unlocked by the install's license (Basic + purchased add-ons). */
  licensedModules: ModuleKey[];
}

/**
 * Resolve the modules a given user may access.
 *
 * - `superadmin` always gets every licensed module. Admin is configurable.
 * - Other roles use the explicit grant list when present, otherwise fall
 *   back to the role preset.
 * - The result is always intersected with `licensedModules` — a per-user
 *   grant can never exceed what the install is licensed for.
 */
export function resolveAccessibleModules(input: ResolveAccessibleModulesInput): ModuleKey[] {
  const role = normalizeAppRole(input.role);
  const licensedSet = new Set(input.licensedModules);

  if (role === "superadmin") {
    return ALL_MODULE_KEYS.filter((m) => licensedSet.has(m));
  }

  const base = input.explicit !== undefined && input.explicit !== null
    ? input.explicit
    : ROLE_MODULE_PRESETS[role];
  return base.filter((m) => licensedSet.has(m));
}
