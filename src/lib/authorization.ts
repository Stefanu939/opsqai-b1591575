/* eslint-disable @typescript-eslint/no-explicit-any */

const PLATFORM_ROLES = new Set(["platform_owner", "platform_admin"]);

export function roleNames(rows: Array<{ role: string }> | null | undefined) {
  return (rows ?? []).map((r) => r.role);
}

export async function getActorRoles(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role, company_id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = roleNames(data as Array<{ role: string }>);
  return {
    roles,
    isPlatformOwner: roles.includes("platform_owner"),
    isPlatformAdmin: roles.some((r) => PLATFORM_ROLES.has(r)),
    isCompanyAdmin: roles.includes("admin"),
    isManager: roles.includes("manager"),
  };
}

export async function hasPermission(context: { supabase: any; userId: string }, permission: string) {
  const { data, error } = await context.supabase.rpc("has_permission", {
    _user_id: context.userId,
    _permission: permission,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function requirePermission(context: { supabase: any; userId: string }, permission: string) {
  if (!(await hasPermission(context, permission))) throw new Error("Forbidden");
}

export async function requireAnyPermission(context: { supabase: any; userId: string }, permissions: string[]) {
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

export async function getProfileCompany(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.company_id ?? null;
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
  return companyId;
}