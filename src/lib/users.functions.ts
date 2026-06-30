import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getActorRoles, requireAnyPermission } from "@/lib/authorization";

const ROLES = ["admin", "manager", "supervisor", "operator", "viewer", "team_leader", "employee"] as const;
const RoleEnum = z.enum(ROLES);

async function getActorCompany(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
  return data?.company_id ?? null;
}

async function requireAdminOrPlatform(supabase: any, userId: string) {
  const { isPlatformAdmin, isCompanyAdmin } = await getActorRoles(supabase, userId);
  if (!isPlatformAdmin && !isCompanyAdmin) throw new Error("Forbidden");
  return { isPlatformAdmin, isCompanyAdmin };
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const parsed = z.object({ company_id: z.string().nullish() }).parse(d ?? {});
    const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return { company_id: parsed.company_id && uuid.test(parsed.company_id) ? parsed.company_id : undefined };
  })
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.update", "user.create", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    const actorCompany = await getActorCompany(context.supabase, context.userId);
    const scope = isPlatformAdmin ? (data.company_id ?? null) : actorCompany;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select("id, full_name, first_name, last_name, position, phone, department_id, language_pref, is_active, created_at, company_id")
      .order("created_at", { ascending: false });
    if (scope) q = q.eq("company_id", scope);
    const { data: profiles, error } = await q;
    if (error) throw new Error(error.message);

    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role, company_id");
    const { data: usersResp } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const { data: depts } = await supabaseAdmin.from("departments").select("id, name");
    const { data: companies } = await supabaseAdmin.from("companies").select("id, name");

    const emailById = new Map(usersResp.users.map((u) => [u.id, u.email ?? ""]));
    const lastSignInById = new Map(usersResp.users.map((u) => [u.id, u.last_sign_in_at ?? null]));
    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role);
      rolesByUser.set(r.user_id, list);
    }
    const deptById = new Map((depts ?? []).map((d) => [d.id, d.name]));
    const compById = new Map((companies ?? []).map((c) => [c.id, c.name]));

    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: emailById.get(p.id) ?? "",
      full_name: p.full_name,
      first_name: p.first_name,
      last_name: p.last_name,
      position: p.position,
      phone: p.phone,
      department_id: p.department_id,
      department_name: p.department_id ? deptById.get(p.department_id) ?? null : null,
      company_id: p.company_id,
      company_name: p.company_id ? compById.get(p.company_id) ?? null : null,
      language_pref: p.language_pref,
      is_active: p.is_active,
      last_sign_in_at: lastSignInById.get(p.id) ?? null,
      created_at: p.created_at,
      roles: rolesByUser.get(p.id) ?? [],
    }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    email: z.string().email(),
    password: z.string().min(8),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    position: z.string().optional(),
    phone: z.string().optional(),
    department_id: z.string().uuid().optional().nullable(),
    role: RoleEnum,
    company_id: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.create", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    const actorCompany = await getActorCompany(context.supabase, context.userId);
    const targetCompany = isPlatformAdmin ? (data.company_id ?? actorCompany) : actorCompany;
    if (!targetCompany) throw new Error("Target company required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.first_name, last_name: data.last_name,
        full_name: [data.first_name, data.last_name].filter(Boolean).join(" ") || data.email.split("@")[0],
        company_id: targetCompany,
        role: data.role,
      },
    });
    if (error || !created.user) throw new Error(error?.message || "Create failed");

    await supabaseAdmin.from("profiles").update({
      first_name: data.first_name ?? null,
      last_name: data.last_name ?? null,
      position: data.position ?? null,
      phone: data.phone ?? null,
      department_id: data.department_id ?? null,
      company_id: targetCompany,
    }).eq("id", created.user.id);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id, role: data.role, company_id: targetCompany,
    });

    try {
      const { dispatchTransactionalEmail } = await import("@/lib/email/dispatch.server");
      const { data: company } = await supabaseAdmin.from("companies").select("name").eq("id", targetCompany).maybeSingle();
      await dispatchTransactionalEmail({
        templateName: "welcome",
        recipientEmail: data.email,
        templateData: {
          firstName: data.first_name ?? data.email.split("@")[0],
          workspaceName: (company as { name?: string } | null)?.name,
        },
      });
    } catch (e) { console.error("[users.createUser] welcome email failed", (e as Error).message); }

    return { ok: true, id: created.user.id };
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    email: z.string().email(),
    role: RoleEnum,
    department_id: z.string().uuid().optional().nullable(),
    company_id: z.string().uuid().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.create", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    const actorCompany = await getActorCompany(context.supabase, context.userId);
    const targetCompany = isPlatformAdmin ? (data.company_id ?? actorCompany) : actorCompany;
    if (!targetCompany) throw new Error("Target company required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Security: never derive auth redirect URL from client-controlled headers.
    const appUrl = (process.env.APP_URL ?? "https://opsqai.de").replace(/\/$/, "");
    const redirectTo = `${appUrl}/accept-invite`;
    const { data: inv, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo,
      data: {
        company_id: targetCompany,
        role: data.role,
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined,
      },
    });
    if (error || !inv.user) throw new Error(error?.message || "Invite failed");

    await supabaseAdmin.from("profiles").update({
      first_name: data.first_name ?? null,
      last_name: data.last_name ?? null,
      full_name: [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
      department_id: data.department_id ?? null,
      company_id: targetCompany,
    }).eq("id", inv.user.id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", inv.user.id);
    await supabaseAdmin.from("user_roles").insert({
      user_id: inv.user.id, role: data.role, company_id: targetCompany,
    });

    try {
      const { dispatchTransactionalEmail } = await import("@/lib/email/dispatch.server");
      const { data: company } = await supabaseAdmin.from("companies").select("name").eq("id", targetCompany).maybeSingle();
      const { data: actorProfile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
      await dispatchTransactionalEmail({
        templateName: "workspace-invitation",
        recipientEmail: data.email,
        templateData: {
          inviterName: (actorProfile as { full_name?: string } | null)?.full_name ?? "An OPSQAI admin",
          workspaceName: (company as { name?: string } | null)?.name,
          role: data.role,
          acceptUrl: redirectTo,
        },
      });
    } catch (e) { console.error("[users.inviteUser] invitation email failed", (e as Error).message); }

    return { ok: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    user_id: z.string().uuid(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    department_id: z.string().uuid().optional().nullable(),
    is_active: z.boolean().optional(),
    roles: z.array(RoleEnum).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.update", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    const actorCompany = await getActorCompany(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify target user is in the same company (unless platform admin)
    if (!isPlatformAdmin) {
      const { data: target } = await supabaseAdmin.from("profiles").select("company_id").eq("id", data.user_id).maybeSingle();
      if (target?.company_id !== actorCompany) throw new Error("Forbidden: cross-company edit");
    }
    const { data: target } = await supabaseAdmin.from("profiles").select("company_id").eq("id", data.user_id).maybeSingle();
    const targetCompany = target?.company_id;

    const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
    await supabaseAdmin.from("profiles").update({
      first_name: data.first_name ?? null,
      last_name: data.last_name ?? null,
      full_name: fullName,
      position: data.position ?? null,
      phone: data.phone ?? null,
      department_id: data.department_id ?? null,
      ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
    }).eq("id", data.user_id);

    if (data.is_active === false) {
      await supabaseAdmin.auth.admin.updateUserById(data.user_id, { ban_duration: "876000h" });
    } else if (data.is_active === true) {
      await supabaseAdmin.auth.admin.updateUserById(data.user_id, { ban_duration: "none" });
    }

    if (data.roles && targetCompany) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).not("role", "in", "(platform_admin,platform_owner)");
      if (data.roles.length > 0) {
        await supabaseAdmin.from("user_roles").insert(
          data.roles.map((r) => ({ user_id: data.user_id, role: r, company_id: targetCompany })),
        );
      }
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.delete", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!isPlatformAdmin) {
      const actorCompany = await getActorCompany(context.supabase, context.userId);
      const { data: target } = await supabaseAdmin.from("profiles").select("company_id").eq("id", data.user_id).maybeSingle();
      if (target?.company_id !== actorCompany) throw new Error("Forbidden");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    user_id: z.string().uuid(),
    new_password: z.string().min(8),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["user.update", "platform.manage"]);
    const { isPlatformAdmin } = await requireAdminOrPlatform(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!isPlatformAdmin) {
      const actorCompany = await getActorCompany(context.supabase, context.userId);
      const { data: target } = await supabaseAdmin.from("profiles").select("company_id").eq("id", data.user_id).maybeSingle();
      if (target?.company_id !== actorCompany) throw new Error("Forbidden");
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.new_password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listDepartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("departments").select("id, name, company_id").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    name: z.string().trim().min(1).max(80),
    company_id: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { isPlatformAdmin, isCompanyAdmin, isManager } = await getActorRoles(context.supabase, context.userId);
    if (!isPlatformAdmin && !isCompanyAdmin && !isManager) throw new Error("Forbidden");
    const actorCompany = await getActorCompany(context.supabase, context.userId);
    const targetCompany = isPlatformAdmin ? (data.company_id ?? actorCompany) : actorCompany;
    if (!targetCompany) throw new Error("Target company required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("departments").select("id, name")
      .eq("company_id", targetCompany).ilike("name", data.name).maybeSingle();
    if (existing) return { id: existing.id, name: existing.name };

    const { data: inserted, error } = await supabaseAdmin
      .from("departments").insert({ name: data.name, company_id: targetCompany })
      .select("id, name").single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    department_id: z.string().uuid().optional().nullable(),
    language_pref: z.enum(["de", "en", "ro"]).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const full = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
    const { error } = await context.supabase.from("profiles").update({
      first_name: data.first_name ?? null,
      last_name: data.last_name ?? null,
      full_name: full,
      position: data.position ?? null,
      phone: data.phone ?? null,
      department_id: data.department_id ?? null,
      ...(data.language_pref ? { language_pref: data.language_pref } : {}),
    }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
