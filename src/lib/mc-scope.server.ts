// Management Center ownership scope.
//
// Every customer record (companies row) has an owner_user_id — the OPSQAI
// colleague responsible for it — plus optional collaborators (holiday cover).
//
// Platform owners (SuperAdmins) see the whole fleet. Every other member of
// staff sees only the customers they own or that are shared with them.
// Server functions must resolve this scope and filter, because Management
// Center reads run through the service-role client which bypasses RLS.

import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { getActorRoles } from "@/lib/authorization";

export type McScope = {
  /** SuperAdmin — sees everything, may reassign owners. */
  isSuperAdmin: boolean;
  userId: string;
  /** null = unrestricted (SuperAdmin). */
  companyIds: string[] | null;
  /** null = unrestricted (SuperAdmin). */
  installIds: string[] | null;
};

type Ctx = { supabase: unknown; userId: string };

export async function resolveMcScope(context: Ctx): Promise<McScope> {
  const actor = await getActorRoles(context.supabase, context.userId);
  if (!actor.isPlatformAdmin) throw new Error("Forbidden: platform admin required");
  if (actor.isPlatformOwner) {
    return { isSuperAdmin: true, userId: context.userId, companyIds: null, installIds: null };
  }

  const admin = await getCloudSupabaseAdmin("mc-scope");
  const [{ data: owned }, { data: shared }] = await Promise.all([
    admin.from("companies").select("id, install_id").eq("owner_user_id", context.userId),
    admin.from("company_collaborators").select("company_id").eq("user_id", context.userId),
  ]);

  const ids = new Set<string>((owned ?? []).map((c) => c.id as string));
  const extra = (shared ?? []).map((r) => r.company_id as string).filter((id) => !ids.has(id));
  for (const id of extra) ids.add(id);

  let installIds = (owned ?? [])
    .map((c) => c.install_id as string | null)
    .filter((v): v is string => Boolean(v));

  if (extra.length) {
    const { data: extraRows } = await admin
      .from("companies")
      .select("install_id")
      .in("id", extra);
    installIds = installIds.concat(
      (extraRows ?? [])
        .map((c) => c.install_id as string | null)
        .filter((v): v is string => Boolean(v)),
    );
  }

  return {
    isSuperAdmin: false,
    userId: context.userId,
    companyIds: [...ids],
    installIds: [...new Set(installIds)],
  };
}

/** Throws unless the actor may act on this customer. */
export async function assertCompanyInScope(context: Ctx, companyId: string): Promise<McScope> {
  const scope = await resolveMcScope(context);
  if (scope.isSuperAdmin) return scope;
  if (!scope.companyIds?.includes(companyId)) {
    throw new Error("Forbidden: this customer belongs to another colleague");
  }
  return scope;
}

/** Throws unless the actor may act on this installation id. */
export async function assertInstallInScope(context: Ctx, installId: string): Promise<McScope> {
  const scope = await resolveMcScope(context);
  if (scope.isSuperAdmin) return scope;
  if (!scope.installIds?.includes(installId)) {
    throw new Error("Forbidden: this installation belongs to another colleague");
  }
  return scope;
}

export function inScope<T>(scope: McScope, rows: T[], key: (row: T) => string | null): T[] {
  if (scope.isSuperAdmin) return rows;
  const allowed = new Set(scope.companyIds ?? []);
  const installs = new Set(scope.installIds ?? []);
  return rows.filter((r) => {
    const k = key(r);
    return k != null && (allowed.has(k) || installs.has(k));
  });
}
