// Management Center control centre — actionable alerts.
//
// Everything is scoped by customer ownership: a colleague only sees alerts for
// their own customers, a SuperAdmin sees the whole fleet.

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { resolveMcScope } from "@/lib/mc-scope.server";

const DAY = 24 * 60 * 60 * 1000;

export type McAlert = {
  kind:
    | "license_expiring"
    | "license_missing"
    | "install_silent"
    | "install_outdated"
    | "products_need_reissue"
    | "ticket_open"
    | "license_collision";
  severity: "critical" | "warning" | "info";
  company_id: string | null;
  company_name: string;
  detail: string;
  /** In-app destination for the action button. */
  to: string;
  install_id?: string;
};

export const getMcAlerts = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const scope = await resolveMcScope(context);
    const admin = await getCloudSupabaseAdmin("mc-alerts");

    let companiesQ = admin
      .from("companies")
      .select("id, name, install_id, enabled_products, active, owner_user_id");
    if (!scope.isSuperAdmin) {
      companiesQ = companiesQ.in("id", scope.companyIds?.length ? scope.companyIds : [""]);
    }
    const { data: companies } = await companiesQ;
    const rows = (companies ?? []).filter((c) => c.active !== false);
    const installIds = rows.map((c) => c.install_id).filter((v): v is string => Boolean(v));

    const since = new Date(Date.now() - 2 * DAY).toISOString();
    const [{ data: fleet }, { data: beats }] = installIds.length
      ? await Promise.all([
          admin
            .from("selfhost_installations")
            .select("install_id, approved_fingerprint, collision_reviewed_at")
            .in("install_id", installIds),
          admin
            .from("selfhost_heartbeats")
            .select("install_id, machine_fingerprint, source_ip_hash, received_at, app_version")
            .in("install_id", installIds)
            .gte("received_at", since)
            .not("machine_fingerprint", "is", null)
            .order("received_at", { ascending: false })
            .limit(5000),
        ])
      : [{ data: [] }, { data: [] }];
    const fleetById = new Map((fleet ?? []).map((f) => [f.install_id, f]));
    const machinesByInstall = new Map<string, Map<string, { last: string; ip: string | null; version: string | null }>>();
    for (const b of beats ?? []) {
      const f = fleetById.get(b.install_id);
      if (f?.collision_reviewed_at && b.received_at < f.collision_reviewed_at) continue;
      const m = machinesByInstall.get(b.install_id) ?? new Map();
      if (!m.has(b.machine_fingerprint!)) {
        m.set(b.machine_fingerprint!, { last: b.received_at, ip: b.source_ip_hash, version: b.app_version });
      }
      machinesByInstall.set(b.install_id, m);
    }

    const [{ data: licenses }, { data: installs }, { data: releases }, { data: tickets }] =
      await Promise.all([
        installIds.length
          ? admin
              .from("licenses")
              .select("install_id, kind, product_key, expires_at, revoked, issued_at")
              .in("install_id", installIds)
          : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
        installIds.length
          ? admin
              .from("license_installs")
              .select("install_id, last_heartbeat_at, app_version")
              .in("install_id", installIds)
          : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
        admin
          .from("license_releases")
          .select("version, channel, is_current, published_at")
          .eq("is_current", true)
          .order("published_at", { ascending: false })
          .limit(1),
        admin
          .from("support_conversations")
          .select("id, company_id, status, priority, last_message_at")
          .in("status", ["open", "pending"]),
      ]);

    const currentVersion = (releases ?? [])[0]?.version as string | undefined;
    const licByInstall = new Map<string, Array<Record<string, unknown>>>();
    for (const l of licenses ?? []) {
      const key = l.install_id as string;
      const list = licByInstall.get(key) ?? [];
      list.push(l);
      licByInstall.set(key, list);
    }
    const installByKey = new Map((installs ?? []).map((i) => [i.install_id as string, i]));
    const ticketsByCompany = new Map<string, number>();
    for (const t of tickets ?? []) {
      if (!t.company_id) continue;
      ticketsByCompany.set(
        t.company_id as string,
        (ticketsByCompany.get(t.company_id as string) ?? 0) + 1,
      );
    }

    const alerts: McAlert[] = [];
    const now = Date.now();

    for (const c of rows) {
      const list = c.install_id ? licByInstall.get(c.install_id) ?? [] : [];
      const installLicense = list.find((l) => l.kind === "install" && !l.revoked);

      if (!installLicense) {
        alerts.push({
          kind: "license_missing",
          severity: "warning",
          company_id: c.id,
          company_name: c.name,
          detail: c.install_id
            ? "No active installation license for this customer."
            : "No installation id and no license yet.",
          to: "/management/licenses",
        });
      } else if (installLicense.expires_at) {
        const days = Math.round(
          (new Date(installLicense.expires_at as string).getTime() - now) / DAY,
        );
        if (days < 0) {
          alerts.push({
            kind: "license_expiring",
            severity: "critical",
            company_id: c.id,
            company_name: c.name,
            detail: `License expired ${Math.abs(days)} days ago.`,
            to: "/management/licenses",
          });
        } else if (days <= 90) {
          alerts.push({
            kind: "license_expiring",
            severity: days <= 30 ? "critical" : days <= 60 ? "warning" : "info",
            company_id: c.id,
            company_name: c.name,
            detail: `License expires in ${days} days.`,
            to: "/management/licenses",
          });
        }
      }

      // Products enabled after the last license was issued → needs a reissue.
      const enabled = (c.enabled_products ?? []) as string[];
      if (enabled.length && installLicense) {
        const licensedProducts = new Set(
          list
            .filter((l) => !l.revoked && l.product_key)
            .map((l) => l.product_key as string),
        );
        const missing = enabled.filter((p) => !licensedProducts.has(p));
        if (missing.length) {
          alerts.push({
            kind: "products_need_reissue",
            severity: "warning",
            company_id: c.id,
            company_name: c.name,
            detail: `${missing.length} enabled product(s) not in the signed license — reissue needed.`,
            to: "/management/licenses",
          });
        }
      }

      if (c.install_id) {
        const machines = machinesByInstall.get(c.install_id);
        const approved = fleetById.get(c.install_id)?.approved_fingerprint ?? null;
        const foreign = machines
          ? [...machines.keys()].filter((fp) => !approved || fp !== approved)
          : [];
        const collision = machines && (machines.size > 1 || (approved && foreign.length > 0));
        if (collision && machines) {
          const list = [...machines.entries()]
            .map(([fp, v]) => `PC ${fp.slice(0, 8)} (ultimul semnal ${new Date(v.last).toLocaleString("ro-RO")}, ${v.version ?? "?"}${v.ip ? `, rețea ${v.ip.slice(0, 6)}` : ""})`)
            .join("; ");
          alerts.push({
            kind: "license_collision",
            severity: "critical",
            company_id: c.id,
            company_name: c.name,
            install_id: c.install_id,
            detail: `Aceeași licență raportează de pe ${machines.size} calculatoare diferite în 48h: ${list}. Verificați cu clientul — nicio blocare automată.`,
            to: "/management/installations",
          });
        }
      }

      const install = c.install_id ? installByKey.get(c.install_id) : undefined;
      if (install) {
        const beat = install.last_heartbeat_at as string | null;
        const age = beat ? now - new Date(beat).getTime() : null;
        if (age === null) {
          alerts.push({
            kind: "install_silent",
            severity: "warning",
            company_id: c.id,
            company_name: c.name,
            detail: "Installation has never reported in.",
            to: "/management/installations",
          });
        } else if (age > 2 * DAY) {
          alerts.push({
            kind: "install_silent",
            severity: "critical",
            company_id: c.id,
            company_name: c.name,
            detail: `No signal for ${Math.round(age / DAY)} days.`,
            to: "/management/installations",
          });
        }
        const version = install.app_version as string | null;
        if (currentVersion && version && version !== currentVersion) {
          alerts.push({
            kind: "install_outdated",
            severity: "info",
            company_id: c.id,
            company_name: c.name,
            detail: `Runs ${version} — current release is ${currentVersion}.`,
            to: "/management/releases",
          });
        }
      }

      const open = ticketsByCompany.get(c.id) ?? 0;
      if (open) {
        alerts.push({
          kind: "ticket_open",
          severity: open > 2 ? "warning" : "info",
          company_id: c.id,
          company_name: c.name,
          detail: `${open} open ticket(s).`,
          to: "/management/support",
        });
      }
    }

    const rank = { critical: 0, warning: 1, info: 2 } as const;
    alerts.sort((a, b) => rank[a.severity] - rank[b.severity] || a.company_name.localeCompare(b.company_name));

    return {
      isSuperAdmin: scope.isSuperAdmin,
      customers: rows.length,
      currentVersion: currentVersion ?? null,
      counts: {
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
      },
      alerts: alerts.slice(0, 120),
    };
  });

/**
 * Human review of a licence collision (Option A, human-in-the-loop).
 * "approve" accepts the most recent machine as the official one (legit
 * migration / restore); "dismiss" only resets the observation window.
 * Never revokes anything — revocation stays a separate manual action.
 */
export const reviewLicenseCollision = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { install_id: string; action: "approve" | "dismiss" }) => {
    if (typeof d?.install_id !== "string" || d.install_id.length < 3 || d.install_id.length > 64)
      throw new Error("install_id invalid");
    if (d.action !== "approve" && d.action !== "dismiss") throw new Error("action invalid");
    return d;
  })
  .handler(async ({ data, context }) => {
    const scope = await resolveMcScope(context);
    const admin = await getCloudSupabaseAdmin("mc-alerts");
    const { data: company } = await admin
      .from("companies")
      .select("id")
      .eq("install_id", data.install_id)
      .maybeSingle();
    if (!company) throw new Error("Not found");
    if (!scope.isSuperAdmin && !scope.companyIds?.includes(company.id)) throw new Error("Forbidden");

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      collision_reviewed_at: now,
      collision_reviewed_by: (context as { userId?: string }).userId ?? null,
    };
    if (data.action === "approve") {
      const { data: last } = await admin
        .from("selfhost_heartbeats")
        .select("machine_fingerprint")
        .eq("install_id", data.install_id)
        .not("machine_fingerprint", "is", null)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      patch.approved_fingerprint = last?.machine_fingerprint ?? null;
    }
    const { error } = await admin
      .from("selfhost_installations")
      .update(patch)
      .eq("install_id", data.install_id);
    if (error) throw new Error("Update failed");
    return { ok: true };
  });
