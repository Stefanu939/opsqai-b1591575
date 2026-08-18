// Per-user module access server functions (SuperAdmin model).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requireAnyPermission, getActorRoles, getProfileCompany } from "@/lib/authorization";
import { getAdminProfileRepository, getModuleAccessRepository, getExportRepository } from "@/lib/providers/registry";
import { isValidModuleKey } from "@/lib/license-modules";
import { getLicensedModules, resolveModuleAccessForUser } from "@/lib/module-access.server";
import { uuidString } from "@/lib/zod-uuid";

/** Caller's own resolved module access, for UI nav gating. */
export const getMyModuleAccess = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const companyId = await getProfileCompany(context.supabase, context.userId);
    if (!companyId) return { role: "employee", superadmin: false, modules: [] };
    return resolveModuleAccessForUser(context, companyId);
  });

export const getUserModuleAccess = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ user_id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.update", "platform.manage"]);
    const target = await getAdminProfileRepository().findByUserId(data.user_id);
    if (!target?.companyId) throw new Error("Target user has no company");
    return resolveModuleAccessForUser({ supabase: context.supabase, userId: data.user_id }, target.companyId);
  });

export const setUserModuleAccess = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: uuidString(),
        modules: z.array(z.string()).max(64),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.update", "platform.manage"]);
    const { isPlatformAdmin } = await getActorRoles(context.supabase, context.userId);
    const actorCompany = await getProfileCompany(context.supabase, context.userId);
    const target = await getAdminProfileRepository().findByUserId(data.user_id);
    if (!target?.companyId) throw new Error("Target user has no company");
    if (!isPlatformAdmin && target.companyId !== actorCompany) {
      throw new Error("Forbidden: cross-company edit");
    }

    // Refuse to store restrictions for superadmins — always return their
    // full (unrestricted) access instead of persisting a narrower grant.
    const current = await resolveModuleAccessForUser(
      { supabase: context.supabase, userId: data.user_id },
      target.companyId,
    );
    if (current.superadmin) {
      return { ok: true, superadmin: true, modules: current.modules };
    }

    const licensed = new Set(await getLicensedModules());
    const moduleKeys = Array.from(new Set(data.modules)).filter(
      (m) => isValidModuleKey(m) && licensed.has(m),
    );

    await getModuleAccessRepository(context.supabase).replaceForUser(
      target.companyId,
      data.user_id,
      moduleKeys,
      context.userId,
    );

    await getExportRepository(context.supabase)
      .writeAudit({
        companyId: target.companyId,
        userId: context.userId,
        module: "audit_log",
        action: "module_access.update",
        resource: data.user_id,
        payload: { modules: moduleKeys },
        severity: "info",
        success: true,
      })
      .catch(() => {});

    return { ok: true, superadmin: false, modules: moduleKeys };
  });
