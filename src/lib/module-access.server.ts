// Server-only enforcement helper: blocks direct API/URL access to a module
// even when the UI nav correctly hides it. Superadmins always bypass.
import { getActorRoles } from "@/lib/authorization";
import { getLicensingProvider, getModuleAccessRepository } from "@/lib/providers/registry";
import { effectiveModules, isValidModuleKey, type ModuleKey } from "@/lib/license-modules";
import { normalizeAppRole, resolveAccessibleModules } from "@/lib/module-access";

/** Highest-priority DB role for a user, mapped through the legacy alias table. */
function primaryRole(roles: string[]): string {
  const order = ["superadmin", "platform_owner", "platform_admin", "admin", "workspace_owner", "manager", "supervisor", "team_leader", "employee", "operator", "viewer"];
  for (const r of order) if (roles.includes(r)) return r;
  return roles[0] ?? "employee";
}

export async function getLicensedModules(): Promise<ModuleKey[]> {
  const ent = await getLicensingProvider().entitlements();
  if (ent.unlimited) {
    const { LICENSE_MODULE_CATALOG } = await import("@/lib/license-modules");
    return LICENSE_MODULE_CATALOG.map((m) => m.key);
  }
  return effectiveModules(ent.modules);
}

export async function resolveModuleAccessForUser(
  context: { supabase: unknown; userId: string },
  companyId: string,
): Promise<{ role: string; superadmin: boolean; modules: ModuleKey[] }> {
  const { roles, isPlatformOwner, isPlatformAdmin } = await getActorRoles(context.supabase, context.userId);
  const role = isPlatformOwner || isPlatformAdmin ? "superadmin" : primaryRole(roles);
  const licensedModules = await getLicensedModules();
  const normalized = normalizeAppRole(role);
  if (normalized === "superadmin") {
    return { role, superadmin: true, modules: licensedModules };
  }
  const grants = await getModuleAccessRepository(context.supabase).listForUser(companyId, context.userId);
  const explicit = grants.length > 0 ? grants.map((g) => g.moduleKey).filter(isValidModuleKey) : null;
  const modules = resolveAccessibleModules({ role, explicit, licensedModules });
  return { role, superadmin: false, modules };
}

/**
 * Throws `Error("Forbidden: module not enabled for this user")` unless the
 * caller is a superadmin or has `moduleKey` in their resolved module set.
 * Call this at the top of module handlers, after existing permission checks.
 */
export async function requireModuleAccess(
  context: { supabase: unknown; userId: string },
  moduleKey: ModuleKey,
  companyId?: string | null,
): Promise<void> {
  const { getProfileCompany } = await import("@/lib/authorization");
  const scope = companyId ?? (await getProfileCompany(context.supabase, context.userId));
  if (!scope) throw new Error("Forbidden: module not enabled for this user");
  const { superadmin, modules } = await resolveModuleAccessForUser(context, scope);
  if (superadmin) return;
  if (!modules.includes(moduleKey)) {
    throw new Error("Forbidden: module not enabled for this user");
  }
}
