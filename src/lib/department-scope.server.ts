// Department isolation for knowledge retrieval (server only).
//
// A document that carries a department only grounds answers for members of that
// department; company-wide documents (no department) ground everybody. Managers,
// team leaders, admins, workspace owners and platform staff see everything.
// Enforced here — never in the browser — so every retrieval path shares it.

export async function resolveDepartmentScope(
  dataCtx: unknown,
  userId: string,
  profileDepartmentId: string | null | undefined,
): Promise<string | null> {
  if (!profileDepartmentId) return null;
  try {
    const { getActorRoles } = await import("@/lib/authorization");
    const roles = await getActorRoles(dataCtx, userId);
    const unrestricted =
      roles.isPlatformOwner ||
      roles.isPlatformAdmin ||
      roles.roles.includes("superadmin") ||
      roles.roles.includes("workspace_owner") ||
      roles.roles.includes("admin") ||
      roles.roles.includes("manager") ||
      roles.roles.includes("team_leader");
    return unrestricted ? null : profileDepartmentId;
  } catch {
    // Fail closed: keep the caller inside their own department.
    return profileDepartmentId;
  }
}

/** True when a document may ground an answer for this department scope. */
export function documentInScope(
  doc: { departmentId?: string | null } | undefined,
  departmentScope: string | null,
): boolean {
  if (!departmentScope) return true;
  if (!doc) return false;
  return !doc.departmentId || doc.departmentId === departmentScope;
}
