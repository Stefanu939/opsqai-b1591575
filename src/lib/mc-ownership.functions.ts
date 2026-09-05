// Management Center — customer ownership ("cards") server functions.
//
// A SuperAdmin sees one card per OPSQAI colleague and can drill into that
// colleague's customers. Regular staff only ever see their own customers,
// plus the ones explicitly shared with them.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { uuidString } from "@/lib/zod-uuid";
import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { resolveMcScope, assertCompanyInScope } from "@/lib/mc-scope.server";

const DAY = 24 * 60 * 60 * 1000;

export type StaffCard = {
  user_id: string | null;
  name: string;
  email: string;
  is_super_admin: boolean;
  customers: number;
  expiring_licenses: number;
  offline_installs: number;
  open_tickets: number;
};

/**
 * Ownership overview. SuperAdmins get one card per colleague (plus an
 * "Unassigned" card); everybody else gets a single card for themselves.
 */
export const listOwnershipCards = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const scope = await resolveMcScope(context);
    const admin = await getCloudSupabaseAdmin("mc-ownership");

    const [{ data: companies }, { data: roleRows }, { data: collabRows }] = await Promise.all([
      admin.from("companies").select("id, name, install_id, owner_user_id, active"),
      admin.from("user_roles").select("user_id, role").in("role", ["platform_admin", "platform_owner"]),
      admin.from("company_collaborators").select("company_id, user_id"),
    ]);

    const staffIds = [...new Set((roleRows ?? []).map((r) => r.user_id as string))];
    const owners = new Set<string>((roleRows ?? [])
      .filter((r) => r.role === "platform_owner")
      .map((r) => r.user_id as string));

    const [{ data: profiles }, usersResp] = await Promise.all([
      staffIds.length
        ? admin.from("profiles").select("id, full_name, first_name, last_name").in("id", staffIds)
        : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const emailById = new Map(usersResp.data.users.map((u) => [u.id, u.email ?? ""]));
    const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

    const rows = companies ?? [];
    const installIds = rows.map((c) => c.install_id).filter((v): v is string => Boolean(v));

    const soon = new Date(Date.now() + 30 * DAY).toISOString();
    const [{ data: licenses }, { data: installs }, { data: tickets }] = await Promise.all([
      installIds.length
        ? admin
            .from("licenses")
            .select("install_id, expires_at, revoked")
            .eq("kind", "install")
            .in("install_id", installIds)
        : Promise.resolve({ data: [] as Array<{ install_id: string; expires_at: string | null; revoked: boolean | null }> }),
      installIds.length
        ? admin
            .from("license_installs")
            .select("install_id, last_heartbeat_at")
            .in("install_id", installIds)
        : Promise.resolve({ data: [] as Array<{ install_id: string; last_heartbeat_at: string | null }> }),
      admin
        .from("support_conversations")
        .select("company_id, status")
        .in("status", ["open", "pending"]),
    ]);

    const expiringInstalls = new Set(
      (licenses ?? [])
        .filter((l) => !l.revoked && l.expires_at && l.expires_at <= soon)
        .map((l) => l.install_id),
    );
    const offlineInstalls = new Set(
      (installs ?? [])
        .filter(
          (i) =>
            !i.last_heartbeat_at ||
            Date.now() - new Date(i.last_heartbeat_at).getTime() > 2 * DAY,
        )
        .map((i) => i.install_id),
    );
    const ticketsByCompany = new Map<string, number>();
    for (const t of tickets ?? []) {
      if (!t.company_id) continue;
      ticketsByCompany.set(t.company_id, (ticketsByCompany.get(t.company_id) ?? 0) + 1);
    }

    const collaboratorsByCompany = new Map<string, string[]>();
    for (const r of collabRows ?? []) {
      const list = collaboratorsByCompany.get(r.company_id as string) ?? [];
      list.push(r.user_id as string);
      collaboratorsByCompany.set(r.company_id as string, list);
    }

    const blank = (): Omit<StaffCard, "user_id" | "name" | "email" | "is_super_admin"> => ({
      customers: 0,
      expiring_licenses: 0,
      offline_installs: 0,
      open_tickets: 0,
    });

    const stats = new Map<string, ReturnType<typeof blank>>();
    const bump = (key: string, c: (typeof rows)[number]) => {
      const s = stats.get(key) ?? blank();
      s.customers += 1;
      if (c.install_id && expiringInstalls.has(c.install_id)) s.expiring_licenses += 1;
      if (c.install_id && offlineInstalls.has(c.install_id)) s.offline_installs += 1;
      s.open_tickets += ticketsByCompany.get(c.id) ?? 0;
      stats.set(key, s);
    };

    for (const c of rows) {
      bump(c.owner_user_id ? (c.owner_user_id as string) : "__unassigned__", c);
    }

    const nameOf = (id: string) => {
      const p = profileById.get(id) as
        | { full_name?: string | null; first_name?: string | null; last_name?: string | null }
        | undefined;
      const composed = [p?.first_name, p?.last_name].filter(Boolean).join(" ");
      return (
        (p?.full_name as string | null) ||
        composed ||
        (emailById.get(id) ?? "").split("@")[0] ||
        "Colleague"
      );
    };

    if (!scope.isSuperAdmin) {
      const own = stats.get(scope.userId) ?? blank();
      // Shared customers count towards my card too.
      let sharedCount = 0;
      for (const [companyId, users] of collaboratorsByCompany) {
        if (users.includes(scope.userId) && !rows.some((c) => c.id === companyId && c.owner_user_id === scope.userId))
          sharedCount += 1;
      }
      const card: StaffCard = {
        user_id: scope.userId,
        name: nameOf(scope.userId),
        email: emailById.get(scope.userId) ?? "",
        is_super_admin: false,
        ...own,
        customers: own.customers + sharedCount,
      };
      return { isSuperAdmin: false, cards: [card] };
    }

    const cards: StaffCard[] = staffIds.map((id) => {
      const s = stats.get(id) ?? blank();
      return {
        user_id: id,
        name: nameOf(id),
        email: emailById.get(id) ?? "",
        is_super_admin: owners.has(id),
        ...s,
      };
    });
    const unassigned = stats.get("__unassigned__");
    if (unassigned) {
      cards.push({
        user_id: null,
        name: "Unassigned",
        email: "",
        is_super_admin: false,
        ...unassigned,
      });
    }
    cards.sort((a, b) => b.customers - a.customers || a.name.localeCompare(b.name));
    return { isSuperAdmin: true, cards };
  });

export type ColleagueCompany = {
  id: string;
  name: string;
  active: boolean;
  subscription_status: string | null;
  install_id: string | null;
  shared: boolean;
  open_tickets: number;
  online: boolean;
  silent: boolean;
  outdated: boolean;
  app_version: string | null;
  expires_at: string | null;
};

export type ColleagueTimeOff = {
  id: string;
  starts_on: string;
  ends_on: string;
  status: string;
  reason: string | null;
  created_at: string;
};

/**
 * SuperAdmin-only: the full work panel for one colleague — their customers
 * (owned + shared), fleet health, open tickets and time-off requests.
 */
export const getColleagueOverview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ user_id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    const scope = await resolveMcScope(context);
    if (!scope.isSuperAdmin) throw new Error("Forbidden: only a SuperAdmin can open colleague panels");
    const admin = await getCloudSupabaseAdmin("mc-ownership");
    const uid = data.user_id;

    const [
      { data: ownedRows },
      { data: collabRows },
      { data: roleRows },
      { data: profile },
      usersResp,
      { data: timeOffRows },
      { data: currentRelease },
    ] = await Promise.all([
      admin
        .from("companies")
        .select("id, name, active, subscription_status, install_id")
        .eq("owner_user_id", uid),
      admin
        .from("company_collaborators")
        .select("company_id, companies(id, name, active, subscription_status, install_id, owner_user_id)")
        .eq("user_id", uid),
      admin.from("user_roles").select("user_id, role").in("role", ["platform_admin", "platform_owner"]),
      admin
        .from("profiles")
        .select("id, full_name, first_name, last_name")
        .eq("id", uid)
        .maybeSingle(),
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin
        .from("time_off_requests")
        .select("id, starts_on, ends_on, status, reason, created_at")
        .eq("user_id", uid)
        .order("starts_on", { ascending: false })
        .limit(12),
      admin
        .from("license_releases")
        .select("version")
        .eq("is_current", true)
        .maybeSingle(),
    ]);

    const emailById = new Map(usersResp.data.users.map((u) => [u.id, u.email ?? ""]));
    const staffIds = [...new Set((roleRows ?? []).map((r) => r.user_id as string))];
    const { data: staffProfiles } = staffIds.length
      ? await admin.from("profiles").select("id, full_name, first_name, last_name").in("id", staffIds)
      : { data: [] as Array<Record<string, unknown>> };
    const staffName = new Map(
      (staffProfiles ?? []).map((p) => {
        const composed = [p.first_name, p.last_name].filter(Boolean).join(" ");
        return [p.id as string, ((p.full_name as string | null) || composed || (emailById.get(p.id as string) ?? "").split("@")[0] || "Colleague") as string];
      }),
    );

    const owned = (ownedRows ?? []) as Array<Record<string, unknown>>;
    const shared = ((collabRows ?? []) as Array<{ companies: Record<string, unknown> | null }>)
      .map((r) => r.companies)
      .filter((c): c is Record<string, unknown> => Boolean(c))
      .filter((c) => c.owner_user_id !== uid);

    const companyIds = [...owned, ...shared].map((c) => c.id as string);
    const installIds = [...owned, ...shared]
      .map((c) => c.install_id as string | null)
      .filter((v): v is string => Boolean(v));

    const soon = new Date(Date.now() + 30 * DAY).toISOString();
    const [{ data: tickets }, { data: installs }, { data: licenses }] = await Promise.all([
      companyIds.length
        ? admin
            .from("support_conversations")
            .select("company_id, status")
            .in("company_id", companyIds)
            .in("status", ["open", "pending"])
        : Promise.resolve({ data: [] as Array<{ company_id: string; status: string }> }),
      installIds.length
        ? admin
            .from("license_installs")
            .select("install_id, last_heartbeat_at, app_version")
            .in("install_id", installIds)
        : Promise.resolve({ data: [] as Array<{ install_id: string; last_heartbeat_at: string | null; app_version: string | null }> }),
      installIds.length
        ? admin
            .from("licenses")
            .select("install_id, expires_at, revoked")
            .eq("kind", "install")
            .in("install_id", installIds)
        : Promise.resolve({ data: [] as Array<{ install_id: string; expires_at: string | null; revoked: boolean | null }> }),
    ]);

    const ticketsByCompany = new Map<string, number>();
    for (const t of tickets ?? []) {
      ticketsByCompany.set(t.company_id, (ticketsByCompany.get(t.company_id) ?? 0) + 1);
    }
    const installById = new Map((installs ?? []).map((i) => [i.install_id, i]));
    const licenseByInstall = new Map((licenses ?? []).map((l) => [l.install_id, l]));
    const currentVersion = (currentRelease?.version as string | undefined) ?? null;

    const toRow = (c: Record<string, unknown>, isShared: boolean): ColleagueCompany => {
      const installId = (c.install_id as string | null) ?? null;
      const inst = installId ? installById.get(installId) : undefined;
      const lic = installId ? licenseByInstall.get(installId) : undefined;
      const lastBeat = inst?.last_heartbeat_at ? new Date(inst.last_heartbeat_at).getTime() : null;
      const online = lastBeat != null && Date.now() - lastBeat < 15 * 60 * 1000;
      const silent = installId != null && (lastBeat == null || Date.now() - lastBeat > 2 * DAY);
      const outdated = Boolean(
        inst?.app_version && currentVersion && inst.app_version !== currentVersion,
      );
      return {
        id: c.id as string,
        name: (c.name as string) ?? "—",
        active: Boolean(c.active),
        subscription_status: (c.subscription_status as string | null) ?? null,
        install_id: installId,
        shared: isShared,
        open_tickets: ticketsByCompany.get(c.id as string) ?? 0,
        online,
        silent,
        outdated,
        app_version: (inst?.app_version as string | null) ?? null,
        expires_at: lic && !lic.revoked ? ((lic.expires_at as string | null) ?? null) : null,
      };
    };

    const companies: ColleagueCompany[] = [
      ...owned.map((c) => toRow(c, false)),
      ...shared.map((c) => toRow(c, true)),
    ].sort((a, b) => a.name.localeCompare(b.name));

    const name =
      (profile?.full_name as string | null) ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      (emailById.get(uid) ?? "").split("@")[0] ||
      "Colleague";

    return {
      member: {
        user_id: uid,
        name,
        email: emailById.get(uid) ?? "",
        is_super_admin: staffIds.includes(uid),
      },
      kpis: {
        customers: companies.length,
        open_tickets: companies.reduce((s, c) => s + c.open_tickets, 0),
        silent_installs: companies.filter((c) => c.silent).length,
        expiring_licenses: companies.filter(
          (c) => c.expires_at && c.expires_at <= soon,
        ).length,
      },
      companies,
      time_off: (timeOffRows ?? []) as Array<Record<string, unknown>>,
      colleagues: staffIds
        .filter((id) => id !== uid)
        .map((id) => ({ user_id: id, name: staffName.get(id) ?? "Colleague", email: emailById.get(id) ?? "" })),
      current_version: currentVersion,
    };
  });

/** SuperAdmin-only: hand a customer over to another colleague. */
export const setCompanyOwner = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: uuidString(), owner_user_id: uuidString().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const scope = await resolveMcScope(context);
    if (!scope.isSuperAdmin) throw new Error("Forbidden: only a SuperAdmin can reassign customers");
    const admin = await getCloudSupabaseAdmin("mc-ownership");
    const { error } = await admin
      .from("companies")
      .update({ owner_user_id: data.owner_user_id })
      .eq("id", data.company_id);
    if (error) throw new Error(error.message);
    if (data.owner_user_id) {
      await admin
        .from("customer_profiles")
        .upsert(
          { company_id: data.company_id, account_manager_id: data.owner_user_id, updated_at: new Date().toISOString() },
          { onConflict: "company_id" },
        );
    }
    return { ok: true };
  });

/** Reassign every customer of one colleague (used when somebody leaves). */
export const reassignAllCustomers = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ from_user_id: uuidString().nullable(), to_user_id: uuidString() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const scope = await resolveMcScope(context);
    if (!scope.isSuperAdmin) throw new Error("Forbidden: only a SuperAdmin can reassign customers");
    const admin = await getCloudSupabaseAdmin("mc-ownership");
    let q = admin.from("companies").update({ owner_user_id: data.to_user_id });
    q = data.from_user_id ? q.eq("owner_user_id", data.from_user_id) : q.is("owner_user_id", null);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCompanyCollaborators = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ company_id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCompanyInScope(context, data.company_id);
    const admin = await getCloudSupabaseAdmin("mc-ownership");
    const { data: rows, error } = await admin
      .from("company_collaborators")
      .select("id, user_id, created_at")
      .eq("company_id", data.company_id);
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.user_id as string);
    if (!ids.length) return [];
    const usersResp = await admin.auth.admin.listUsers({ perPage: 1000 });
    const emailById = new Map(usersResp.data.users.map((u) => [u.id, u.email ?? ""]));
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      user_id: r.user_id as string,
      email: emailById.get(r.user_id as string) ?? "",
      created_at: r.created_at as string,
    }));
  });

export const setCompanyCollaborator = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: uuidString(),
        user_id: uuidString(),
        shared: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCompanyInScope(context, data.company_id);
    const admin = await getCloudSupabaseAdmin("mc-ownership");
    if (!data.shared) {
      const { error } = await admin
        .from("company_collaborators")
        .delete()
        .eq("company_id", data.company_id)
        .eq("user_id", data.user_id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await admin
      .from("company_collaborators")
      .upsert(
        { company_id: data.company_id, user_id: data.user_id, created_by: context.userId },
        { onConflict: "company_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
