import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ROLES = ["admin", "manager", "team_leader", "employee"] as const;
const RoleEnum = z.enum(ROLES);

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, first_name, last_name, position, phone, department_id, language_pref, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: usersResp } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const { data: depts } = await supabaseAdmin.from("departments").select("id, name");

    const emailById = new Map(usersResp.users.map((u) => [u.id, u.email ?? ""]));
    const lastSignInById = new Map(usersResp.users.map((u) => [u.id, u.last_sign_in_at ?? null]));
    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role);
      rolesByUser.set(r.user_id, list);
    }
    const deptById = new Map((depts ?? []).map((d) => [d.id, d.name]));

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
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { first_name: data.first_name, last_name: data.last_name,
        full_name: [data.first_name, data.last_name].filter(Boolean).join(" ") || data.email.split("@")[0] },
    });
    if (error || !created.user) throw new Error(error?.message || "Create failed");

    await supabaseAdmin.from("profiles").update({
      first_name: data.first_name ?? null,
      last_name: data.last_name ?? null,
      position: data.position ?? null,
      phone: data.phone ?? null,
      department_id: data.department_id ?? null,
    }).eq("id", created.user.id);

    // Replace default 'employee' with requested role
    if (data.role !== "employee") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    }
    return { ok: true, id: created.user.id };
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    email: z.string().email(),
    role: RoleEnum,
    department_id: z.string().uuid().optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
    if (error || !inv.user) throw new Error(error?.message || "Invite failed");
    await supabaseAdmin.from("profiles").update({
      department_id: data.department_id ?? null,
    }).eq("id", inv.user.id);
    if (data.role !== "employee") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", inv.user.id);
      await supabaseAdmin.from("user_roles").insert({ user_id: inv.user.id, role: data.role });
    }
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
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
      // Disable sign-in by setting a ban duration (Auth admin)
      await supabaseAdmin.auth.admin.updateUserById(data.user_id, { ban_duration: "876000h" });
    } else if (data.is_active === true) {
      await supabaseAdmin.auth.admin.updateUserById(data.user_id, { ban_duration: "none" });
    }

    if (data.roles) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
      if (data.roles.length > 0) {
        await supabaseAdmin.from("user_roles").insert(
          data.roles.map((r) => ({ user_id: data.user_id, role: r })),
        );
      }
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.new_password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listDepartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("departments").select("id, name").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    position: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    department_id: z.string().uuid().optional().nullable(),
    language_pref: z.enum(["de", "en"]).optional(),
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
