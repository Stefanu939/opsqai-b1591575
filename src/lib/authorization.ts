/* eslint-disable @typescript-eslint/no-explicit-any */
//
// Wave C.2a.1: authorization helpers resolve roles, permissions, profile
// company, and platform ownership through the repository layer.
//
// Signatures accept `supabase` for backwards compatibility with existing
// server-fn call sites; the value is passed through to the factories as
// the opaque `dataCtx`. On Cloud that's a user-scoped SupabaseClient;
// on Self-Hosted the factories ignore it and use their bootstrap pool.

import {
  getAdminCompanyRepository,
  getProfileRepository,
  getRoleRepository,
} from "@/lib/providers/registry";

const PLATFORM_ROLES = new Set(["platform_owner", "platform_admin"]);

export function roleNames(rows: Array<{ role: string }> | null | undefined) {
  return (rows ?? []).map((r) => r.role);
}

export async function getActorRoles(supabase: any, userId: string) {
  const repo = getRoleRepository(supabase);
  const [roles, isPlatformOwner] = await Promise.all([
    repo.listRolesForUser(userId),
    repo.isPlatformOwner(userId),
  ]);
  return {
    roles,
    isPlatformOwner,
    isPlatformAdmin: isPlatformOwner || roles.some((r) => PLATFORM_ROLES.has(r)),
    isCompanyAdmin: roles.includes("admin"),
    isManager: roles.includes("manager"),
  };
}

export async function hasPermission(
  context: { supabase: any; userId: string },
  permission: string,
) {
  return getRoleRepository(context.supabase).hasPermission(context.userId, permission);
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
    const first = await getAdminCompanyRepository().findFirstActive();
    if (first?.id) return first.id;
  }
  throw new Error("No company assigned");
}
