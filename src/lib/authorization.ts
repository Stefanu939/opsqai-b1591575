/* eslint-disable @typescript-eslint/no-explicit-any */
//
// Wave C.2a.1.b: authorization helpers now resolve roles and profile
// company through the repository layer (`getRoleRepository`,
// `getProfileRepository`). Signatures are unchanged so existing server
// functions keep compiling; the `context.supabase` argument is passed
// through as the opaque `dataCtx` the factories expect.
//
// `hasPermission` still uses `context.supabase.rpc("has_permission")`
// on Cloud. On Self-Hosted the throwing data-context proxy will surface
// this as a "feature not migrated (Wave C.2)" diagnostic — permissions
// derived from roles will move to `IRoleRepository.listPermissionsForRole`
// in a later sub-wave.

import { getProfileRepository, getRoleRepository } from "@/lib/providers/registry";

const PLATFORM_ROLES = new Set(["platform_owner", "platform_admin"]);

export function roleNames(rows: Array<{ role: string }> | null | undefined) {
  return (rows ?? []).map((r) => r.role);
}

export async function getActorRoles(supabase: any, userId: string) {
  const roles = await getRoleRepository(supabase).listRolesForUser(userId);
  return {
    roles,
    isPlatformOwner: roles.includes("platform_owner"),
    isPlatformAdmin: roles.some((r) => PLATFORM_ROLES.has(r)),
    isCompanyAdmin: roles.includes("admin"),
    isManager: roles.includes("manager"),
  };
}

export async function hasPermission(
  context: { supabase: any; userId: string },
  permission: string,
) {
  const { data, error } = await context.supabase.rpc("has_permission", {
    _user_id: context.userId,
    _permission: permission,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function requirePermission(
  context: { supabase: any; userId: string },
  permission: string,
) {
  if (!(await hasPermission(context, permission))) throw new Error("Forbidden");
}

export async function requireAnyPermission(
  context: { supabase: any; userId: string },
  permissions: string[],
) {
  for (const permission of permissions) {
    if (await hasPermission(context, permission)) return;
  }
  throw new Error("Forbidden");
}

export async function requirePlatformAdmin(context: { supabase: any; userId: string }) {
  const actor = await getActorRoles(context.supabase, context.userId);
  if (!actor.isPlatformAdmin) throw new Error("Forbidden: platform admin required");
  return actor;
}

/**
 * Customer Delivery Center gate: Platform Owner and Platform Super Admin ONLY.
 * This is an internal OPSQAI business tool — never accessible to customer-side
 * roles (workspace_owner, admin, manager, supervisor, operator).
 */
export async function requireCustomerManagerAccess(context: { supabase: any; userId: string }) {
  const actor = await getActorRoles(context.supabase, context.userId);
  if (actor.isPlatformAdmin) return actor;
  throw new Error("Forbidden: customer delivery center access required");
}

export async function getProfileCompany(supabase: any, userId: string): Promise<string | null> {
  const profile = await getProfileRepository(supabase).findByUserId(userId);
  return profile?.companyId ?? null;
}

export function companyFromStoragePath(path: string | null | undefined): string | null {
  const first = (path ?? "").split("/")[0];
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(first)
    ? first
    : null;
}

export async function resolveCompanyForWrite(
  context: { supabase: any; userId: string },
  hint?: string | null,
) {
  const actor = await getActorRoles(context.supabase, context.userId);
  if (actor.isPlatformAdmin && hint) return hint;
  const companyId = await getProfileCompany(context.supabase, context.userId);
  if (companyId) return companyId;
  if (actor.isPlatformAdmin) {
    // `companies` table is not yet abstracted (Wave C.2a.2). This branch
    // stays on the raw data context and will throw on Self-Hosted's
    // throwing proxy until then — matches the documented C.2 exception.
    const { data, error } = await context.supabase
      .from("companies")
      .select("id")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return data.id as string;
  }
  throw new Error("No company assigned");
}
