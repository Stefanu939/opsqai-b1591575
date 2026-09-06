import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { AREA_ACTIONS } from "@/lib/area-rights";
import { getActorRoles, getProfileCompany, requireAnyPermission } from "@/lib/authorization";
import { getAdminProfileRepository, getAdminRoleRepository, getAreaRightsRepository, getExportRepository } from "@/lib/providers/registry";
import { uuidString } from "@/lib/zod-uuid";

const rightSchema = z.object({
  area: z.string().regex(/^[a-z][a-z0-9_]{1,63}$/),
  action: z.enum(AREA_ACTIONS),
  granted: z.boolean(),
});

async function targetContext(context: { supabase: unknown; userId: string }, userId: string) {
  await requireAnyPermission(context, ["user.update", "platform.manage"]);
  const target = await getAdminProfileRepository().findByUserId(userId);
  if (!target?.companyId) throw new Error("Target user has no company");
  const actor = await getActorRoles(context.supabase, context.userId);
  const actorCompany = await getProfileCompany(context.supabase, context.userId);
  if (!actor.isPlatformAdmin && actorCompany !== target.companyId) throw new Error("Forbidden: cross-company edit");
  const targetRoles = await getActorRoles(context.supabase, userId);
  return {
    companyId: target.companyId,
    roles: targetRoles.roles,
    unrestricted: targetRoles.isPlatformOwner || targetRoles.isPlatformAdmin || targetRoles.roles.includes("superadmin"),
  };
}

export const getUserAreaRights = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ user_id: uuidString() }).parse(input))
  .handler(async ({ data, context }) => {
    const target = await targetContext(context, data.user_id);
    const repo = getAreaRightsRepository(context.supabase);
    const [catalog, rights] = await Promise.all([
      repo.listCatalog(),
      target.unrestricted ? Promise.resolve([]) : repo.listForUser(target.companyId, data.user_id),
    ]);
    if (target.unrestricted || rights.length > 0) return { unrestricted: target.unrestricted, catalog, rights };
    const permissionLists = await Promise.all(target.roles.map((role) => getAdminRoleRepository().listPermissionsForRole(role)));
    const rolePermissions = new Set(permissionLists.flat());
    return {
      unrestricted: false,
      catalog,
      rights: catalog.map((item) => ({
        userId: data.user_id,
        companyId: target.companyId,
        areaKey: item.areaKey,
        action: item.action,
        granted: rolePermissions.has(item.permissionKey),
        grantedBy: null,
      })),
    };
  });

export const setUserAreaRights = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ user_id: uuidString(), rights: z.array(rightSchema).max(256) }).parse(input))
  .handler(async ({ data, context }) => {
    const target = await targetContext(context, data.user_id);
    if (target.unrestricted) return { ok: true, unrestricted: true };
    const repo = getAreaRightsRepository(context.supabase);
    const catalog = await repo.listCatalog();
    const allowed = new Set(catalog.map((item) => `${item.areaKey}:${item.action}`));
    const rights = data.rights.filter((right) => allowed.has(`${right.area}:${right.action}`));
    await repo.replaceForUser(target.companyId, data.user_id, rights, context.userId);
    await getExportRepository(context.supabase).writeAudit({
      companyId: target.companyId, userId: context.userId, module: "audit_log",
      action: "area_rights.update", resource: data.user_id, payload: { rights }, severity: "warning", success: true,
    }).catch(() => {});
    return { ok: true, unrestricted: false };
  });