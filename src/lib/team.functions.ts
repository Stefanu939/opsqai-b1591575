/**
 * OPSQAI Team management (Management Center).
 *
 * These server functions manage employees of OPSQAI itself — the users that
 * belong to the internal system company (`companies.is_system = true`).
 * They are NOT customer/workspace users.
 *
 * Access: platform_owner or platform_admin only.
 * Promote to platform_admin: platform_admin+ can promote/demote.
 * Promote to platform_owner: only platform_owner can grant this (immutable
 * owner flag is never granted here — kept sacred).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { getActorRoles } from "@/lib/authorization";

const INTERNAL_ROLES = ["admin", "manager", "team_leader", "employee"] as const;
const InternalRoleEnum = z.enum(INTERNAL_ROLES);

async function requirePlatform(context: { supabase: any; userId: string }) {
  const a = await getActorRoles(context.supabase, context.userId);
  if (!a.isPlatformAdmin) throw new Error("Forbidden");
  return a;
}

async function getSystemCompanyId(supabaseAdmin: any): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("is_system", true)
    .maybeSingle();
  if (error || !data) throw new Error("System company not found");
  return data.id as string;
}

export const listTeamMembers = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatform(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const systemCompany = await getSystemCompanyId(supabaseAdmin);

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, first_name, last_name, full_name, position, phone, department_id, is_active, created_at, company_id",
      )
      .eq("company_id", systemCompany)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.id);
    const [rolesRes, authRes, deptRes] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role, is_platform_owner"),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin
        .from("departments")
        .select("id, name")
        .eq("company_id", systemCompany),
    ]);

    const emailById = new Map(
      (authRes.data?.users ?? []).map((u: any) => [u.id, u.email ?? ""]),
    );
    const lastSignInById = new Map(
      (authRes.data?.users ?? []).map((u: any) => [u.id, u.last_sign_in_at ?? null]),
    );
    const rolesByUser = new Map<string, { role: string; is_platform_owner: boolean }[]>();
    for (const r of rolesRes.data ?? []) {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push({ role: r.role, is_platform_owner: !!r.is_platform_owner });
      rolesByUser.set(r.user_id, list);
    }
    const deptById = new Map((deptRes.data ?? []).map((d: any) => [d.id, d.name]));

    return (profiles ?? [])
      .filter((p) => ids.includes(p.id))
      .map((p) => {
        const roles = rolesByUser.get(p.id) ?? [];
        return {
          id: p.id,
          email: emailById.get(p.id) ?? "",
          first_name: p.first_name,
          last_name: p.last_name,
          full_name: p.full_name,
          position: p.position,
          phone: p.phone,
          department_id: p.department_id,
          department_name: p.department_id
            ? (deptById.get(p.department_id) ?? null)
            : null,
          is_active: p.is_active,
          last_sign_in_at: lastSignInById.get(p.id) ?? null,
          created_at: p.created_at,
          roles: roles.map((r) => r.role),
          is_platform_owner: roles.some((r) => r.is_platform_owner),
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const systemCompany = await getSystemCompanyId(supabaseAdmin);
    const { data, error } = await supabaseAdmin
      .from("departments")
      .select("id, name")
      .eq("company_id", systemCompany)
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTeamDepartment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().trim().min(1).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatform(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const systemCompany = await getSystemCompanyId(supabaseAdmin);
    const { data: existing } = await supabaseAdmin
      .from("departments")
      .select("id, name")
      .eq("company_id", systemCompany)
      .ilike("name", data.name)
      .maybeSingle();
    if (existing) return existing;
    const { data: inserted, error } = await supabaseAdmin
      .from("departments")
      .insert({ name: data.name, company_id: systemCompany })
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const deleteTeamDepartment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatform(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const systemCompany = await getSystemCompanyId(supabaseAdmin);
    // Only allow deletion of departments belonging to the system company.
    const { data: dept } = await supabaseAdmin
      .from("departments")
      .select("id, company_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!dept || dept.company_id !== systemCompany) throw new Error("Not found");
    await supabaseAdmin
      .from("profiles")
      .update({ department_id: null })
      .eq("department_id", data.id);
    const { error } = await supabaseAdmin.from("departments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
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
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatform(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const systemCompany = await getSystemCompanyId(supabaseAdmin);

    const fullName =
      [data.first_name, data.last_name].filter(Boolean).join(" ") ||
      data.email.split("@")[0];

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: fullName,
        company_id: systemCompany,
        role: data.role,
        opsqai_team: true,
      },
    });
    if (error || !created.user) throw new Error(error?.message || "Create failed");

    await supabaseAdmin
      .from("profiles")
      .update({
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        full_name: fullName,
        position: data.position ?? null,
        phone: data.phone ?? null,
        department_id: data.department_id ?? null,
        company_id: systemCompany,
        is_active: true,
      })
      .eq("id", created.user.id);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    type UserRoleInsert = {
      user_id: string;
      role:
        | "admin"
        | "manager"
        | "team_leader"
        | "employee"
        | "platform_admin";
      company_id: string;
    };
    const rolesToInsert: UserRoleInsert[] = [
      { user_id: created.user.id, role: data.role, company_id: systemCompany },
    ];
    if (data.make_platform_admin) {
      rolesToInsert.push({
        user_id: created.user.id,
        role: "platform_admin",
        company_id: systemCompany,
      });
    }
    const { error: rErr } = await supabaseAdmin.from("user_roles").insert(rolesToInsert);
    if (rErr) throw new Error(rErr.message);

    return { ok: true, id: created.user.id };
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const systemCompany = await getSystemCompanyId(supabaseAdmin);

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!target || target.company_id !== systemCompany) throw new Error("Not a team member");

    const fullName =
      [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
    await supabaseAdmin
      .from("profiles")
      .update({
        ...(data.first_name !== undefined ? { first_name: data.first_name } : {}),
        ...(data.last_name !== undefined ? { last_name: data.last_name } : {}),
        ...(data.first_name !== undefined || data.last_name !== undefined
          ? { full_name: fullName }
          : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.department_id !== undefined
          ? { department_id: data.department_id }
          : {}),
        ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
      })
      .eq("id", data.user_id);

    if (data.is_active === false) {
      await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        ban_duration: "876000h",
      });
    } else if (data.is_active === true) {
      await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        ban_duration: "none",
      });
    }

    if (data.role) {
      // Replace only the non-platform role rows.
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .not("role", "in", "(platform_admin,platform_owner)");
      await supabaseAdmin.from("user_roles").insert({
        user_id: data.user_id,
        role: data.role,
        company_id: systemCompany,
      });
    }

    return { ok: true };
  });

export const promoteToPlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatform(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const systemCompany = await getSystemCompanyId(supabaseAdmin);

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!target || target.company_id !== systemCompany) throw new Error("Not a team member");

    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", data.user_id)
      .eq("role", "platform_admin")
      .maybeSingle();
    if (existing) return { ok: true, already: true };

    const { error } = await supabaseAdmin.from("user_roles").insert({
      user_id: data.user_id,
      role: "platform_admin",
      company_id: systemCompany,
    });
    if (error) throw new Error(error.message);
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Never demote a platform_owner (immutable).
    const { data: ownerRow } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", data.user_id)
      .eq("role", "platform_owner")
      .maybeSingle();
    if (ownerRow) throw new Error("Platform owner cannot be demoted");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "platform_admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatform(context);
    if (data.user_id === context.userId) throw new Error("You cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const systemCompany = await getSystemCompanyId(supabaseAdmin);

    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!target || target.company_id !== systemCompany) throw new Error("Not a team member");

    // Never delete an immutable platform_owner.
    const { data: ownerRow } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", data.user_id)
      .eq("role", "platform_owner")
      .maybeSingle();
    if (ownerRow) throw new Error("Platform owner cannot be deleted");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetTeamMemberPassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        new_password: z.string().min(8),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatform(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const systemCompany = await getSystemCompanyId(supabaseAdmin);
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", data.user_id)
      .maybeSingle();
    if (!target || target.company_id !== systemCompany) throw new Error("Not a team member");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.new_password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
