import { createServerFn } from "@tanstack/react-start";

import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { getActorRoles, requireAnyPermission } from "@/lib/authorization";
import {
  getAdminCompanyRepository,
  getAdminDepartmentRepository,
  getAdminProfileRepository,
  getAdminRoleRepository,
  getAuthAdminProvider,
  getProfileRepository,
  getStorageProvider,
} from "@/lib/providers/registry";
import { uuidString } from "@/lib/zod-uuid";
import { getModuleAccessRepository, getExportRepository } from "@/lib/providers/registry";
import { isValidModuleKey } from "@/lib/license-modules";
import { LEGACY_ROLE_MAP } from "@/lib/module-access";

const RoleKey = z.string().regex(/^[a-z][a-z0-9_]{1,63}$/);

async function getActorCompany(supabase: unknown, userId: string): Promise<string | null> {
  const profile = await getAdminProfileRepository().findByUserId(userId);
  if (profile?.companyId) return profile.companyId;
  // Fallback via user-scoped repo (Cloud RLS) for edge cases where the
  // admin-flavour repo is unavailable during a request.
  const { getProfileRepository } = await import("@/lib/providers/registry");
  const p = await getProfileRepository(supabase).findByUserId(userId);
  return p?.companyId ?? null;
}

async function requireAdminOrPlatform(supabase: unknown, userId: string) {
  const { isPlatformAdmin, isCompanyAdmin } = await getActorRoles(supabase, userId);
  if (!isPlatformAdmin && !isCompanyAdmin) throw new Error("Forbidden");
  return { isPlatformAdmin, isCompanyAdmin };
}


function isSuperadminRole(role: string): boolean {
  return LEGACY_ROLE_MAP[role] === "superadmin";
}

/**
 * Safety rule: at least one active superadmin must always exist. Throws a
 * clear error if removing/demoting/disabling `userId` (who currently holds
 * a superadmin-equivalent role) would leave zero active superadmins.
 */
async function assertNotLastActiveSuperadmin(
  roleRepo: ReturnType<typeof getAdminRoleRepository>,
  profileRepo: ReturnType<typeof getAdminProfileRepository>,
  userId: string,
) {
  const assignments = await roleRepo.listAssignmentsDetailed();
  const superadminUserIds = new Set(
    assignments.filter((a) => isSuperadminRole(a.role)).map((a) => a.userId),
  );
  if (!superadminUserIds.has(userId)) return;
  let activeCount = 0;
  for (const id of superadminUserIds) {
    const p = await profileRepo.findByUserId(id);
    if (p?.isActive !== false) activeCount += 1;
  }
  if (activeCount <= 1) {
    throw new Error(
      "Forbidden: at least one active superadmin must always exist — cannot remove, disable, or downgrade the last one",
    );
  }
}

async function assertCanGrantSuperadmin(context: { supabase: unknown; userId: string }, roles: string[]) {
  if (!roles.some(isSuperadminRole)) return;
  const { getActorRoles } = await import("@/lib/authorization");
  const actor = await getActorRoles(context.supabase, context.userId);
  const actorIsSuperadmin = actor.isPlatformAdmin || actor.roles.some(isSuperadminRole);
  if (!actorIsSuperadmin) {
    throw new Error("Forbidden: only an existing superadmin may grant the superadmin role");
  }
}

/**
 * Persists explicit module grants for a non-superadmin user and records the
 * change in the audit log. Superadmins are never restricted, so any incoming
 * selection is ignored for them.
 */
async function persistModuleAccess(
  context: { supabase: unknown; userId: string },
  args: { userId: string; companyId: string; roles: string[]; modules?: string[] | null },
) {
  if (!args.modules) return;
  if (args.roles.some(isSuperadminRole)) return;
  const { getLicensedModules } = await import("@/lib/module-access.server");
  const licensed = new Set(await getLicensedModules());
  const moduleKeys = Array.from(new Set(args.modules)).filter(
    (m) => isValidModuleKey(m) && licensed.has(m),
  );
  await getModuleAccessRepository(context.supabase).replaceForUser(
    args.companyId,
    args.userId,
    moduleKeys,
    context.userId,
  );
  await getExportRepository(context.supabase)
    .writeAudit({
      companyId: args.companyId,
      userId: context.userId,
      module: "audit_log",
      action: "module_access.update",
      resource: args.userId,
      payload: { modules: moduleKeys },
      severity: "info",
      success: true,
    })
    .catch(() => {});
}

/** Records role / superadmin changes in the audit log (best-effort). */
async function auditRoleChange(
  context: { supabase: unknown; userId: string },
  args: { userId: string; companyId: string | null | undefined; roles: string[]; action: string },
) {
  if (!args.companyId) return;
  await getExportRepository(context.supabase)
    .writeAudit({
      companyId: args.companyId,
      userId: context.userId,
      module: "audit_log",
      action: args.action,
      resource: args.userId,
      payload: { roles: args.roles, superadmin: args.roles.some(isSuperadminRole) },
      severity: args.roles.some(isSuperadminRole) ? "warning" : "info",
      success: true,
    })
    .catch(() => {});
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => {
    const parsed = z.object({ company_id: z.string().nullish() }).parse(d ?? {});
    const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return {
      company_id: parsed.company_id && uuid.test(parsed.company_id) ? parsed.company_id : undefined,
    };
  })
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.update", "user.create", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    const actorCompany = await getActorCompany(context.supabase, context.userId);
    const scope = isPlatformAdmin ? (data.company_id ?? null) : actorCompany;

    const profileRepo = getAdminProfileRepository();
    const roleRepo = getAdminRoleRepository();
    const deptRepo = getAdminDepartmentRepository();
    const companyRepo = getAdminCompanyRepository();
    const authAdmin = getAuthAdminProvider();

    const [profiles, roles, users, depts, companies] = await Promise.all([
      scope ? profileRepo.listByCompany(scope) : profileRepo.listByCompany(""),
      roleRepo.listAssignments(),
      authAdmin.listUsers(),
      deptRepo.list(),
      companyRepo.list(),
    ]);

    // Platform admin without a company filter: aggregate from the auth roster.
    // A user whose profile row is missing (or was created a moment ago and has
    // not been patched yet) must still appear, so profile misses are backfilled
    // from the auth record instead of being dropped.
    const profilesEffective = scope
      ? profiles
      : await Promise.all(users.map((u) => profileRepo.findByUserId(u.id))).then((rs) =>
          rs.filter((r): r is NonNullable<typeof r> => !!r),
        );

    const emailById = new Map(users.map((u) => [u.id, u.email]));
    const lastSignInById = new Map(users.map((u) => [u.id, u.lastSignInAt]));
    const createdById = new Map(users.map((u) => [u.id, u.createdAt]));
    const authMetaById = new Map(users.map((u) => [u.id, u]));
    const rolesByUser = new Map<string, string[]>();
    for (const r of roles) {
      const list = rolesByUser.get(r.userId) ?? [];
      list.push(r.role);
      rolesByUser.set(r.userId, list);
    }
    const deptById = new Map(depts.map((d) => [d.id, d.name]));
    const compById = new Map(companies.map((c) => [c.id, c.name]));

    const rows = profilesEffective.map((p) => ({
      id: p.userId,
      email: emailById.get(p.userId) ?? p.email ?? "",
      full_name: p.fullName,
      first_name: p.firstName,
      last_name: p.lastName,
      avatar_url: p.avatarUrl,
      position: p.position,
      phone: p.phone,
      department_id: p.departmentId,
      department_name: p.departmentId ? (deptById.get(p.departmentId) ?? null) : null,
      company_id: p.companyId as string | null,
      company_name: p.companyId ? (compById.get(p.companyId) ?? null) : null,
      language_pref: p.languagePref,
      is_active: p.isActive,
      last_sign_in_at: lastSignInById.get(p.userId) ?? null,
      created_at: p.createdAt,
      roles: rolesByUser.get(p.userId) ?? [],
      email_confirmed: authMetaById.get(p.userId)?.emailConfirmed ?? true,
      account_disabled: authMetaById.get(p.userId)?.disabled ?? false,
      invited: authMetaById.get(p.userId)?.invited ?? false,
    }));

    if (!scope) {
      // Backfill auth-only users (no profile row yet) so a just-created user is
      // never invisible. Scoped (multi-tenant) listing stays strict: a user
      // without a profile has no company and must not leak across tenants.
      const seen = new Set(rows.map((r) => r.id));
      for (const u of users) {
        if (seen.has(u.id)) continue;
        rows.push({
          id: u.id,
          email: u.email ?? "",
          full_name: null,
          first_name: null,
          last_name: null,
          avatar_url: null,
          position: null,
          phone: null,
          department_id: null,
          department_name: null,
          company_id: null,
          company_name: null,
          language_pref: "en",
          is_active: true,
          last_sign_in_at: u.lastSignInAt ?? null,
          created_at: u.createdAt,
          roles: rolesByUser.get(u.id) ?? [],
          email_confirmed: u.emailConfirmed,
          account_disabled: u.disabled,
          invited: u.invited,
        });
      }
    }

    rows.sort((a, b) => {
      const at = Date.parse(createdById.get(a.id) ?? a.created_at ?? "") || 0;
      const bt = Date.parse(createdById.get(b.id) ?? b.created_at ?? "") || 0;
      return bt - at;
    });

    return rows;

  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        position: z.string().optional(),
        phone: z.string().optional(),
        department_id: uuidString().optional().nullable(),
        role: RoleKey,
        company_id: uuidString().optional(),
        /**
         * Self-Hosted: force password change on first sign-in (temp-password flow).
         * Cloud: recorded in user_metadata so the app can prompt.
         */
        must_change_password: z.boolean().optional(),
        /** Explicit module access for non-superadmin users; omitted = role preset. */
        modules: z.array(z.string()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.create", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    const actorCompany = await getActorCompany(context.supabase, context.userId);
    const targetCompany = isPlatformAdmin ? (data.company_id ?? actorCompany) : actorCompany;
    if (!targetCompany) throw new Error("Target company required");

    const authAdmin = getAuthAdminProvider();
    const profileRepo = getAdminProfileRepository();
    const roleRepo = getAdminRoleRepository();
    const companyRepo = getAdminCompanyRepository();

    const fullName =
      [data.first_name, data.last_name].filter(Boolean).join(" ") ||
      data.email.split("@")[0];

    const workspace = await companyRepo.findById(targetCompany);

    const { id: newUserId } = await authAdmin.createUser({
      email: data.email,
      password: data.password,
      emailConfirm: true,
      mustChangePassword: data.must_change_password,
      metadata: {
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: fullName,
        company_id: targetCompany,
        role: data.role,
      },
      welcomeEmail: {
        firstName: data.first_name,
        workspaceName: workspace?.name ?? null,
      },
    });

    await profileRepo.updateByUserId(newUserId, {
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      fullName,
      position: data.position ?? null,
      phone: data.phone ?? null,
      departmentId: data.department_id ?? null,
      companyId: targetCompany,
    });

    await roleRepo.removeAllRoles(newUserId);
    await roleRepo.addRole(newUserId, data.role, targetCompany);

    return { ok: true, id: newUserId };
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email(),
        role: RoleKey,
        department_id: uuidString().optional().nullable(),
        company_id: uuidString().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.create", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    const actorCompany = await getActorCompany(context.supabase, context.userId);
    const targetCompany = isPlatformAdmin ? (data.company_id ?? actorCompany) : actorCompany;
    if (!targetCompany) throw new Error("Target company required");

    const authAdmin = getAuthAdminProvider();
    if (!authAdmin.supportsEmailInvite) {
      throw new Error(
        "Email invitations are not available on this installation. " +
          "Create the user with a temporary password instead.",
      );
    }

    const profileRepo = getAdminProfileRepository();
    const roleRepo = getAdminRoleRepository();
    const companyRepo = getAdminCompanyRepository();

    const fullName =
      [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined;

    // Security: never derive auth redirect URL from client-controlled headers.
    const appUrl = (process.env.APP_URL ?? "https://opsqai.de").replace(/\/$/, "");
    const redirectTo = `${appUrl}/accept-invite`;

    const workspace = await companyRepo.findById(targetCompany);
    const actorProfile = await profileRepo.findByUserId(context.userId);

    const { id: invitedId } = await authAdmin.inviteByEmail({
      email: data.email,
      redirectTo,
      metadata: {
        company_id: targetCompany,
        role: data.role,
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: fullName,
      },
      emailData: {
        inviterName: actorProfile?.fullName ?? undefined,
        workspaceName: workspace?.name ?? null,
        role: data.role,
      },
    });

    await profileRepo.updateByUserId(invitedId, {
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      fullName: fullName ?? null,
      departmentId: data.department_id ?? null,
      companyId: targetCompany,
    });
    await roleRepo.removeAllRoles(invitedId);
    await roleRepo.addRole(invitedId, data.role, targetCompany);

    return { ok: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: uuidString(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        position: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        department_id: uuidString().optional().nullable(),
        is_active: z.boolean().optional(),
        roles: z.array(RoleKey).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.update", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    const actorCompany = await getActorCompany(context.supabase, context.userId);

    const profileRepo = getAdminProfileRepository();
    const roleRepo = getAdminRoleRepository();
    const authAdmin = getAuthAdminProvider();

    const target = await profileRepo.findByUserId(data.user_id);
    if (await roleRepo.isPlatformOwner(data.user_id)) {
      throw new Error("The installation owner cannot be disabled, demoted, or edited here");
    }
    if (!isPlatformAdmin && target?.companyId !== actorCompany) {
      throw new Error("Forbidden: cross-company edit");
    }
    const targetCompany = target?.companyId;

    const patch: Parameters<typeof profileRepo.updateByUserId>[1] = {};
    if (data.first_name !== undefined) patch.firstName = data.first_name;
    if (data.last_name !== undefined) patch.lastName = data.last_name;
    if (data.first_name !== undefined || data.last_name !== undefined) {
      patch.fullName =
        [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
    }
    if (data.position !== undefined) patch.position = data.position;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.department_id !== undefined) patch.departmentId = data.department_id;
    if (data.is_active !== undefined) patch.isActive = data.is_active;
    if (Object.keys(patch).length > 0) {
      await profileRepo.updateByUserId(data.user_id, patch);
    }


    if (data.is_active !== undefined) {
      await authAdmin.setDisabled(data.user_id, !data.is_active);
    }

    if (data.roles && targetCompany) {
      await roleRepo.removeNonPlatformRoles(data.user_id);
      for (const r of data.roles) {
        await roleRepo.addRole(data.user_id, r, targetCompany);
      }
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { user_id: string }) => z.object({ user_id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.delete", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Cannot delete yourself");
    if (await getAdminRoleRepository().isPlatformOwner(data.user_id)) {
      throw new Error("The installation owner cannot be deleted");
    }
    if (!isPlatformAdmin) {
      const actorCompany = await getActorCompany(context.supabase, context.userId);
      const target = await getAdminProfileRepository().findByUserId(data.user_id);
      if (target?.companyId !== actorCompany) throw new Error("Forbidden");
    }
    await getAuthAdminProvider().deleteUser(data.user_id);
    return { ok: true };
  });

export const updateUserEmail = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: uuidString(),
        new_email: z.string().trim().toLowerCase().email(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.update", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    if (await getAdminRoleRepository().isPlatformOwner(data.user_id)) {
      throw new Error("The installation owner's email cannot be changed here");
    }
    if (!isPlatformAdmin) {
      const actorCompany = await getActorCompany(context.supabase, context.userId);
      const target = await getAdminProfileRepository().findByUserId(data.user_id);
      if (target?.companyId !== actorCompany) throw new Error("Forbidden");
    }
    await getAuthAdminProvider().updateEmail(data.user_id, data.new_email);
    return { ok: true };
  });

const AVATAR_BUCKET = "avatars";
const AVATAR_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const updateUserAvatar = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: uuidString(),
        filename: z.string().min(1),
        content_type: z.enum(AVATAR_CONTENT_TYPES),
        data_base64: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.update", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    if (!isPlatformAdmin) {
      const actorCompany = await getActorCompany(context.supabase, context.userId);
      const target = await getAdminProfileRepository().findByUserId(data.user_id);
      if (target?.companyId !== actorCompany) throw new Error("Forbidden");
    }
    const ext =
      data.content_type === "image/png" ? "png" : data.content_type === "image/webp" ? "webp" : "jpg";
    const key = `${data.user_id}/avatar-${Date.now()}.${ext}`;
    const binary = atob(data.data_base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    await getStorageProvider().put({
      bucket: AVATAR_BUCKET,
      key,
      body: bytes,
      contentType: data.content_type,
    });
    await getAdminProfileRepository().updateByUserId(data.user_id, { avatarUrl: key });
    return { path: key };
  });

export const clearUserAvatar = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { user_id: string }) => z.object({ user_id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.update", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    if (!isPlatformAdmin) {
      const actorCompany = await getActorCompany(context.supabase, context.userId);
      const target = await getAdminProfileRepository().findByUserId(data.user_id);
      if (target?.companyId !== actorCompany) throw new Error("Forbidden");
    }
    await getAdminProfileRepository().updateByUserId(data.user_id, { avatarUrl: null });
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: uuidString(),
        new_password: z.string().min(8),
        must_change_password: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.update", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    if (!isPlatformAdmin) {
      const actorCompany = await getActorCompany(context.supabase, context.userId);
      const target = await getAdminProfileRepository().findByUserId(data.user_id);
      if (target?.companyId !== actorCompany) throw new Error("Forbidden");
    }
    await getAuthAdminProvider().updatePassword(data.user_id, data.new_password, {
      mustChangePassword: data.must_change_password,
    });
    return { ok: true };
  });

export const listDepartments = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    const depts = await getAdminDepartmentRepository().list();
    return depts.map((d) => ({ id: d.id, name: d.name, company_id: d.companyId }));
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const profile = await getProfileRepository(context.supabase).findByUserId(context.userId);
    if (!profile) return null;
    return {
      first_name: profile.firstName,
      last_name: profile.lastName,
      position: profile.position,
      phone: profile.phone,
      department_id: profile.departmentId,
      language_pref: profile.languagePref,
    };
  });

export const createDepartment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(80),
        company_id: uuidString().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { isPlatformAdmin, isCompanyAdmin, isManager } = await getActorRoles(
      context.supabase,
      context.userId,
    );
    if (!isPlatformAdmin && !isCompanyAdmin && !isManager) throw new Error("Forbidden");
    const actorCompany = await getActorCompany(context.supabase, context.userId);
    const targetCompany = isPlatformAdmin ? (data.company_id ?? actorCompany) : actorCompany;
    if (!targetCompany) throw new Error("Target company required");

    const deptRepo = getAdminDepartmentRepository();
    const existing = await deptRepo.findByNameCI(targetCompany, data.name);
    if (existing) return { id: existing.id, name: existing.name };
    const created = await deptRepo.create({ name: data.name, companyId: targetCompany });
    return { id: created.id, name: created.name };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        position: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        department_id: uuidString().optional().nullable(),
        language_pref: z.enum(["de", "en", "ro"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const full = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
    await getAdminProfileRepository().updateByUserId(context.userId, {
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      fullName: full,
      position: data.position ?? null,
      phone: data.phone ?? null,
      departmentId: data.department_id ?? null,
      ...(data.language_pref !== undefined ? { languagePref: data.language_pref } : {}),
    });
    return { ok: true };
  });
