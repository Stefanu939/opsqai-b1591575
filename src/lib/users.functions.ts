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
} from "@/lib/providers/registry";

const ROLES = [
  "admin",
  "manager",
  "supervisor",
  "operator",
  "viewer",
  "team_leader",
  "employee",
] as const;
const RoleEnum = z.enum(ROLES);

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

    // When scope is null (platform admin, no filter), listByCompany("")
    // returns rows for that literal — instead fall back to per-user auth
    // records + a role join. For simplicity, when scope is null we
    // aggregate from auth users.
    const profilesEffective = scope
      ? profiles
      : await Promise.all(
          users.map((u) => profileRepo.findByUserId(u.id)),
        ).then((rs) => rs.filter((r): r is NonNullable<typeof r> => !!r));

    const emailById = new Map(users.map((u) => [u.id, u.email]));
    const lastSignInById = new Map(users.map((u) => [u.id, u.lastSignInAt]));
    const rolesByUser = new Map<string, string[]>();
    for (const r of roles) {
      const list = rolesByUser.get(r.userId) ?? [];
      list.push(r.role);
      rolesByUser.set(r.userId, list);
    }
    const deptById = new Map(depts.map((d) => [d.id, d.name]));
    const compById = new Map(companies.map((c) => [c.id, c.name]));

    return profilesEffective.map((p) => ({
      id: p.userId,
      email: emailById.get(p.userId) ?? p.email ?? "",
      full_name: p.fullName,
      first_name: p.firstName,
      last_name: p.lastName,
      position: p.position,
      phone: p.phone,
      department_id: p.departmentId,
      department_name: p.departmentId ? (deptById.get(p.departmentId) ?? null) : null,
      company_id: p.companyId,
      company_name: p.companyId ? (compById.get(p.companyId) ?? null) : null,
      language_pref: p.languagePref,
      is_active: p.isActive,
      last_sign_in_at: lastSignInById.get(p.userId) ?? null,
      created_at: p.createdAt,
      roles: rolesByUser.get(p.userId) ?? [],
    }));
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
        department_id: z.string().uuid().optional().nullable(),
        role: RoleEnum,
        company_id: z.string().uuid().optional(),
        /**
         * Self-Hosted: force password change on first sign-in (temp-password flow).
         * Cloud: recorded in user_metadata so the app can prompt.
         */
        must_change_password: z.boolean().optional(),
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
        role: RoleEnum,
        department_id: z.string().uuid().optional().nullable(),
        company_id: z.string().uuid().optional(),
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
        user_id: z.string().uuid(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        position: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        department_id: z.string().uuid().optional().nullable(),
        is_active: z.boolean().optional(),
        roles: z.array(RoleEnum).optional(),
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
    if (!isPlatformAdmin && target?.companyId !== actorCompany) {
      throw new Error("Forbidden: cross-company edit");
    }
    const targetCompany = target?.companyId;

    const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
    await profileRepo.updateByUserId(data.user_id, {
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      fullName,
      position: data.position ?? null,
      phone: data.phone ?? null,
      departmentId: data.department_id ?? null,
      ...(data.is_active !== undefined ? { isActive: data.is_active } : {}),
    });

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
  .inputValidator((d: { user_id: string }) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.delete", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Cannot delete yourself");
    if (!isPlatformAdmin) {
      const actorCompany = await getActorCompany(context.supabase, context.userId);
      const target = await getAdminProfileRepository().findByUserId(data.user_id);
      if (target?.companyId !== actorCompany) throw new Error("Forbidden");
    }
    await getAuthAdminProvider().deleteUser(data.user_id);
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
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

export const createDepartment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(80),
        company_id: z.string().uuid().optional(),
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
        department_id: z.string().uuid().optional().nullable(),
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
