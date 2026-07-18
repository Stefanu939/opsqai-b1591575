import { getCloudSupabase , getCloudSupabaseAdmin} from "@/lib/providers/not-available";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/authorization";

const CompanyInput = z.object({
  name: z.string().min(1),
  subscription_status: z.enum(["active", "suspended", "trial", "cancelled"]).optional(),
  subscription_plan: z.enum(["free", "starter", "pro", "enterprise"]).optional(),
  max_users: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

export const listCompanies = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("companies");
    const { data: companies, error } = await supabaseAdmin
      .from("companies")
      .select("id, name, subscription_status, subscription_plan, max_users, active, created_at, install_id")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Aggregate counts
    const { data: profileCounts } = await supabaseAdmin.from("profiles").select("company_id");
    const { data: docCounts } = await supabaseAdmin
      .from("knowledge_documents")
      .select("company_id");
    const { data: faqCounts } = await supabaseAdmin.from("faqs").select("company_id");

    const tally = (rows: Array<{ company_id: string }> | null) => {
      const m = new Map<string, number>();
      for (const r of rows ?? []) m.set(r.company_id, (m.get(r.company_id) ?? 0) + 1);
      return m;
    };
    const usersBy = tally(profileCounts);
    const docsBy = tally(docCounts);
    const faqsBy = tally(faqCounts);

    return (companies ?? []).map((c) => ({
      ...c,
      user_count: usersBy.get(c.id) ?? 0,
      document_count: docsBy.get(c.id) ?? 0,
      faq_count: faqsBy.get(c.id) ?? 0,
    }));
  });

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    CompanyInput.extend({
      admin_email: z.string().email(),
      admin_password: z.string().min(8),
      admin_first_name: z.string().optional(),
      admin_last_name: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("companies");
    const { data: company, error } = await supabaseAdmin
      .from("companies")
      .insert({
        name: data.name,
        subscription_status: data.subscription_status ?? "active",
        subscription_plan: data.subscription_plan ?? "free",
        max_users: data.max_users ?? 10,
        active: data.active ?? true,
      })
      .select("id")
      .single();
    if (error || !company) throw new Error(error?.message || "Company create failed");

    const { data: created, error: uerr } = await supabaseAdmin.auth.admin.createUser({
      email: data.admin_email,
      password: data.admin_password,
      email_confirm: true,
      user_metadata: {
        first_name: data.admin_first_name,
        last_name: data.admin_last_name,
        full_name:
          [data.admin_first_name, data.admin_last_name].filter(Boolean).join(" ") ||
          data.admin_email.split("@")[0],
        company_id: company.id,
        role: "admin",
      },
    });
    if (uerr || !created.user) throw new Error(uerr?.message || "Admin user create failed");

    // The trigger places this user in the right company; ensure 'admin' role bound to this company:
    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    await supabaseAdmin.from("user_roles").insert({
      user_id: created.user.id,
      role: "admin",
      company_id: company.id,
    });
    await supabaseAdmin
      .from("profiles")
      .update({ company_id: company.id })
      .eq("id", created.user.id);

    return { ok: true, company_id: company.id, admin_user_id: created.user.id };
  });

export const updateCompany = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("companies");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("companies").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    if (data.id === "00000000-0000-0000-0000-000000000001")
      throw new Error("Cannot delete Default Company");
    const supabaseAdmin = await getCloudSupabaseAdmin("companies");
    const { error } = await supabaseAdmin.from("companies").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const platformStats = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("companies");
    const [companies, profiles, docs, audit] = await Promise.all([
      supabaseAdmin.from("companies").select("id, active", { count: "exact" }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("knowledge_documents").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("audit_log").select("id", { count: "exact", head: true }),
    ]);
    const total = companies.data?.length ?? 0;
    const active = (companies.data ?? []).filter((c) => c.active).length;
    return {
      total_companies: total,
      active_companies: active,
      total_users: profiles.count ?? 0,
      total_documents: docs.count ?? 0,
      total_questions: audit.count ?? 0,
    };
  });

// ============= Platform Super Admin management =============

export const listPlatformAdmins = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    // Data API reads use the user-scoped client (platform admin has RLS access).
    // supabaseAdmin is reserved for Auth Admin API calls only, since Lovable Cloud
    // service-role keys can be non-JWT and break PostgREST reads.
    const { data: roleRows, error } = await getCloudSupabase(context, "companies")
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "platform_admin");
    if (error) throw new Error(error.message);
    if (!roleRows?.length) return [];
    const ids = roleRows.map((r) => r.user_id);
    const supabaseAdmin = await getCloudSupabaseAdmin("companies");
    const [{ data: profiles }, usersResp] = await Promise.all([
      getCloudSupabase(context, "companies")
        .from("profiles")
        .select("id, full_name, first_name, last_name")
        .in("id", ids),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const emailById = new Map(usersResp.data.users.map((u) => [u.id, u.email ?? ""]));
    const lastById = new Map(usersResp.data.users.map((u) => [u.id, u.last_sign_in_at ?? null]));
    const pById = new Map((profiles ?? []).map((p) => [p.id, p]));
    return roleRows.map((r) => {
      const p = pById.get(r.user_id);
      return {
        id: r.user_id,
        email: emailById.get(r.user_id) ?? "",
        full_name: p?.full_name ?? null,
        last_sign_in_at: lastById.get(r.user_id) ?? null,
        granted_at: r.created_at,
      };
    });
  });

export const promotePlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("companies");
    // Auth Admin API is fine with the service-role key; Data API reads go
    // through the user-scoped client (RLS allows platform admins).
    let target: { id: string } | undefined;
    const needle = data.email.toLowerCase();
    for (let page = 1; page <= 20 && !target; page++) {
      const { data: usersResp, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (listErr) throw new Error(listErr.message);
      target = usersResp.users.find((u) => (u.email ?? "").toLowerCase() === needle);
      if (usersResp.users.length < 200) break;
    }
    if (!target) throw new Error("User not found. Ask them to sign up first.");
    const { error } = await getCloudSupabase(context, "companies")
      .from("user_roles")
      .upsert(
        { user_id: target.id, role: "platform_admin", company_id: null },
        { onConflict: "user_id,role" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, user_id: target.id };
  });

export const demotePlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    if (data.user_id === context.userId) throw new Error("You cannot demote yourself");
    const { count } = await getCloudSupabase(context, "companies")
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "platform_admin");
    if ((count ?? 0) <= 1) throw new Error("At least one Platform Super Admin must remain");
    const { error } = await getCloudSupabase(context, "companies")
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "platform_admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
