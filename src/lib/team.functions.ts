/**
 * OPSQAI Team management (Management Center).
 *
 * These server functions manage employees of OPSQAI itself — the users
 * that belong to the internal system company. On Cloud that's the row
 * with `companies.is_system=TRUE`; on Self-Hosted (single-tenant) it's
 * the synthetic tenant company.
 *
 * Access: platform_owner or platform_admin only.
 * Promote to platform_admin: platform_admin+ can promote/demote.
 * platform_owner is immutable — never granted, revoked, or demoted here.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { getActorRoles } from "@/lib/authorization";
import {
  getAdminCompanyRepository,
  getAdminDepartmentRepository,
  getAdminProfileRepository,
  getAdminRoleRepository,
  getAuthAdminProvider,
} from "@/lib/providers/registry";

const INTERNAL_ROLES = ["admin", "manager", "team_leader", "employee"] as const;
const InternalRoleEnum = z.enum(INTERNAL_ROLES);

async function requirePlatform(context: { supabase: unknown; userId: string }) {
  const a = await getActorRoles(context.supabase, context.userId);
  if (!a.isPlatformAdmin) throw new Error("Forbidden");
  return a;
}

async function getSystemCompanyId(): Promise<string> {
  const c = await getAdminCompanyRepository().findSystemCompany();
  if (!c) throw new Error("System company not found");
  return c.id;
}

export const listTeamMembers = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatform(context);
    const systemCompany = await getSystemCompanyId();

    const profileRepo = getAdminProfileRepository();
    const roleRepo = getAdminRoleRepository();
    const deptRepo = getAdminDepartmentRepository();
    const authAdmin = getAuthAdminProvider();

    const profiles = await profileRepo.listByCompany(systemCompany);
    const [rolesDetailed, users, depts] = await Promise.all([
      roleRepo.listAssignmentsDetailed(profiles.map((p) => p.userId)),
      authAdmin.listUsers(),
      deptRepo.list(systemCompany),
    ]);

    const emailById = new Map(users.map((u) => [u.id, u.email]));
    const lastSignInById = new Map(users.map((u) => [u.id, u.lastSignInAt]));
    const rolesByUser = new Map<string, { role: string; isPlatformOwner: boolean }[]>();
    for (const r of rolesDetailed) {
      const list = rolesByUser.get(r.userId) ?? [];
      list.push({ role: r.role, isPlatformOwner: r.isPlatformOwner });
      rolesByUser.set(r.userId, list);
    }
    const deptById = new Map(depts.map((d) => [d.id, d.name]));

    return profiles.map((p) => {
      const roles = rolesByUser.get(p.userId) ?? [];
      return {
        id: p.userId,
        email: emailById.get(p.userId) ?? p.email ?? "",
        first_name: p.firstName,
        last_name: p.lastName,
        full_name: p.fullName,
        position: p.position,
        phone: p.phone,
        department_id: p.departmentId,
        department_name: p.departmentId ? (deptById.get(p.departmentId) ?? null) : null,
        is_active: p.isActive,
        last_sign_in_at: lastSignInById.get(p.userId) ?? null,
        created_at: p.createdAt,
        roles: roles.map((r) => r.role),
        is_platform_owner: roles.some((r) => r.isPlatformOwner),
        is_platform_admin: roles.some(
          (r) => r.role === "platform_admin" || r.role === "platform_owner",
        ),
      };
    });
  });

export const listTeamDepartments = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatform(context);
    const systemCompany = await getSystemCompanyId();
    const depts = await getAdminDepartmentRepository().list(systemCompany);
    return depts.map((d) => ({ id: d.id, name: d.name }));
  });

export const createTeamDepartment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().trim().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatform(context);
    const systemCompany = await getSystemCompanyId();
    const repo = getAdminDepartmentRepository();
    const existing = await repo.findByNameCI(systemCompany, data.name);
    if (existing) return { id: existing.id, name: existing.name };
    const created = await repo.create({ name: data.name, companyId: systemCompany });
    return { id: created.id, name: created.name };
  });

export const deleteTeamDepartment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatform(context);
    const systemCompany = await getSystemCompanyId();
    await getAdminDepartmentRepository().delete(data.id, systemCompany);
    return { ok: true };
  });

export const createTeamMember = createServerFn({ method: "POST" })
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
        role: InternalRoleEnum.default("employee"),
        make_platform_admin: z.boolean().default(false),
        /** Force password change on first sign-in (temp-password flow). */
        must_change_password: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatform(context);
    const systemCompany = await getSystemCompanyId();
    const authAdmin = getAuthAdminProvider();
    const profileRepo = getAdminProfileRepository();
    const roleRepo = getAdminRoleRepository();

    const fullName =
      [data.first_name, data.last_name].filter(Boolean).join(" ") ||
      data.email.split("@")[0];

    const { id: newId } = await authAdmin.createUser({
      email: data.email,
      password: data.password,
      emailConfirm: true,
      mustChangePassword: data.must_change_password,
      metadata: {
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: fullName,
        company_id: systemCompany,
        role: data.role,
        opsqai_team: true,
      },
    });

    await profileRepo.updateByUserId(newId, {
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      fullName,
      position: data.position ?? null,
      phone: data.phone ?? null,
      departmentId: data.department_id ?? null,
      companyId: systemCompany,
      isActive: true,
    });

    await roleRepo.removeAllRoles(newId);
    await roleRepo.addRole(newId, data.role, systemCompany);
    if (data.make_platform_admin) {
      await roleRepo.addRole(newId, "platform_admin", systemCompany);
    }

    return { ok: true, id: newId };
  });

export const updateTeamMember = createServerFn({ method: "POST" })
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
        role: InternalRoleEnum.optional(),
        is_active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatform(context);
    const systemCompany = await getSystemCompanyId();
    const profileRepo = getAdminProfileRepository();
    const roleRepo = getAdminRoleRepository();
    const authAdmin = getAuthAdminProvider();

    const target = await profileRepo.findByUserId(data.user_id);
    if (!target || target.companyId !== systemCompany) {
      throw new Error("Not a team member");
    }

    const fullName =
      [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
    const patch: Parameters<typeof profileRepo.updateByUserId>[1] = {};
    if (data.first_name !== undefined) patch.firstName = data.first_name;
    if (data.last_name !== undefined) patch.lastName = data.last_name;
    if (data.first_name !== undefined || data.last_name !== undefined) {
      patch.fullName = fullName;
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

    if (data.role) {
      await roleRepo.removeNonPlatformRoles(data.user_id);
      await roleRepo.addRole(data.user_id, data.role, systemCompany);
    }

    return { ok: true };
  });

export const promoteToPlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatform(context);
    const systemCompany = await getSystemCompanyId();
    const profileRepo = getAdminProfileRepository();
    const roleRepo = getAdminRoleRepository();

    const target = await profileRepo.findByUserId(data.user_id);
    if (!target || target.companyId !== systemCompany) {
      throw new Error("Not a team member");
    }

    if (await roleRepo.hasRole(data.user_id, "platform_admin")) {
      return { ok: true, already: true };
    }
    await roleRepo.addRole(data.user_id, "platform_admin", systemCompany);
    return { ok: true };
  });

export const demoteFromPlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatform(context);
    if (data.user_id === context.userId) {
      throw new Error("You cannot demote yourself");
    }
    const roleRepo = getAdminRoleRepository();
    if (await roleRepo.isPlatformOwner(data.user_id)) {
      throw new Error("Platform owner cannot be demoted");
    }
    await roleRepo.removeRole(data.user_id, "platform_admin");
    return { ok: true };
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatform(context);
    if (data.user_id === context.userId) throw new Error("You cannot delete yourself");
    const systemCompany = await getSystemCompanyId();
    const profileRepo = getAdminProfileRepository();
    const roleRepo = getAdminRoleRepository();

    const target = await profileRepo.findByUserId(data.user_id);
    if (!target || target.companyId !== systemCompany) {
      throw new Error("Not a team member");
    }
    if (await roleRepo.isPlatformOwner(data.user_id)) {
      throw new Error("Platform owner cannot be deleted");
    }
    await getAuthAdminProvider().deleteUser(data.user_id);
    return { ok: true };
  });

export const resetTeamMemberPassword = createServerFn({ method: "POST" })
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
    await requirePlatform(context);
    const systemCompany = await getSystemCompanyId();
    const target = await getAdminProfileRepository().findByUserId(data.user_id);
    if (!target || target.companyId !== systemCompany) {
      throw new Error("Not a team member");
    }
    await getAuthAdminProvider().updatePassword(data.user_id, data.new_password, {
      mustChangePassword: data.must_change_password,
    });
    return { ok: true };
  });
