// Installation history per customer: which version each installation runs,
// when the customer last downloaded a package, and whether the installation is
// behind the current release. Staff-only (Management Center).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { getCloudSupabase } from "@/lib/providers/not-available";
import { assertInstallInScope } from "@/lib/mc-scope.server";

export interface InstallHistoryDownload {
  id: string;
  actor_email: string | null;
  actor_role: string | null;
  created_at: string;
  storage_path: string | null;
}

export interface InstallHistoryEntry {
  install_id: string;
  organization_name: string | null;
  current_version: string | null;
  installer_version: string | null;
  latest_version: string | null;
  behind: boolean;
  last_heartbeat_at: string | null;
  last_download_at: string | null;
  download_count: number;
  downloads: InstallHistoryDownload[];
}

const Input = z.object({
  install_ids: z.array(z.string().min(1).max(120)).min(1).max(50),
});

export const getInstallHistory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<InstallHistoryEntry[]> => {
    await requirePlatformAdmin(context);
    for (const id of data.install_ids) await assertInstallInScope(context, id);

    const db = getCloudSupabase(context, "install-history");

    const [releaseRes, selfhostRes, installsRes, downloadsRes] = await Promise.all([
      db
        .from("license_releases")
        .select("version, published_at, is_current, channel")
        .eq("channel", "stable")
        .order("published_at", { ascending: false })
        .limit(20),
      db
        .from("selfhost_installations")
        .select("install_id, organization_name, app_version, last_heartbeat_at")
        .in("install_id", data.install_ids),
      db
        .from("license_installs")
        .select("install_id, app_version, installer_version, last_heartbeat_at")
        .in("install_id", data.install_ids),
      db
        .from("installation_package_downloads")
        .select("id, install_id, actor_email, actor_role, created_at, storage_path")
        .in("install_id", data.install_ids)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const releases = releaseRes.data ?? [];
    const latest = releases.find((r) => r.is_current)?.version ?? releases[0]?.version ?? null;

    const selfhost = new Map((selfhostRes.data ?? []).map((r) => [r.install_id, r]));
    const installs = new Map((installsRes.data ?? []).map((r) => [r.install_id, r]));

    const downloadsByInstall = new Map<string, InstallHistoryDownload[]>();
    for (const row of downloadsRes.data ?? []) {
      const list = downloadsByInstall.get(row.install_id) ?? [];
      list.push({
        id: row.id,
        actor_email: row.actor_email,
        actor_role: row.actor_role,
        created_at: row.created_at,
        storage_path: row.storage_path,
      });
      downloadsByInstall.set(row.install_id, list);
    }

    return data.install_ids.map((install_id) => {
      const sh = selfhost.get(install_id);
      const li = installs.get(install_id);
      const current_version = nz(sh?.app_version) ?? nz(li?.app_version);
      const downloads = downloadsByInstall.get(install_id) ?? [];
      return {
        install_id,
        organization_name: sh?.organization_name ?? null,
        current_version,
        installer_version: nz(li?.installer_version),

        latest_version: latest,
        behind: Boolean(current_version && latest && current_version !== latest),
        last_heartbeat_at: sh?.last_heartbeat_at ?? li?.last_heartbeat_at ?? null,
        last_download_at: downloads[0]?.created_at ?? null,
        download_count: downloads.length,
        downloads: downloads.slice(0, 10),
      };
    });
  });

/** Customer-facing: version + verification status for the caller's own installs. */
export const getMyInstallStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    if (!email) return { latest_version: null as string | null, installs: [] };

    const { getCloudSupabaseAdmin } = await import("@/lib/providers/not-available");
    const admin = await getCloudSupabaseAdmin("portal");

    const { data: lics } = await admin
      .from("licenses")
      .select("install_id, company_name")
      .eq("contact_email", email)
      .eq("kind", "install");
    const ids = Array.from(new Set((lics ?? []).map((l) => l.install_id)));
    if (ids.length === 0) return { latest_version: null as string | null, installs: [] };

    const [releaseRes, shRes, liRes, dlRes] = await Promise.all([
      admin
        .from("license_releases")
        .select("version, published_at, is_current, channel")
        .eq("channel", "stable")
        .order("published_at", { ascending: false })
        .limit(20),
      admin
        .from("selfhost_installations")
        .select("install_id, organization_name, app_version, last_heartbeat_at, license_status")
        .in("install_id", ids),
      admin
        .from("license_installs")
        .select("install_id, app_version, installer_version, last_heartbeat_at, user_count")
        .in("install_id", ids),
      admin
        .from("installation_package_downloads")
        .select("install_id, created_at")
        .in("install_id", ids)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const releases = releaseRes.data ?? [];
    const latest = releases.find((r) => r.is_current)?.version ?? releases[0]?.version ?? null;
    const sh = new Map((shRes.data ?? []).map((r) => [r.install_id, r]));
    const li = new Map((liRes.data ?? []).map((r) => [r.install_id, r]));
    const lastDownload = new Map<string, string>();
    for (const row of dlRes.data ?? []) {
      if (!lastDownload.has(row.install_id)) lastDownload.set(row.install_id, row.created_at);
    }

    return {
      latest_version: latest,
      installs: ids.map((install_id) => {
        const s = sh.get(install_id);
        const l = li.get(install_id);
        const current_version = nz(s?.app_version) ?? nz(l?.app_version);
        return {
          install_id,
          company_name:
            s?.organization_name ??
            (lics ?? []).find((x) => x.install_id === install_id)?.company_name ??
            null,
          current_version,
          installer_version: nz(l?.installer_version),
          latest_version: latest,
          behind: Boolean(current_version && latest && current_version !== latest),
          last_heartbeat_at: s?.last_heartbeat_at ?? l?.last_heartbeat_at ?? null,
          last_download_at: lastDownload.get(install_id) ?? null,
          license_status: s?.license_status ?? null,
          user_count: l?.user_count ?? null,
        };
      }),
    };
  });

/** Customer-facing download log: what was downloaded, when, which version. */
export interface MyDownloadLogRow {
  id: string;
  install_id: string;
  kind: string;
  version: string | null;
  actor_email: string | null;
  created_at: string;
}

export const getMyDownloadLog = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<MyDownloadLogRow[]> => {
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    if (!email) return [];

    const { getCloudSupabaseAdmin } = await import("@/lib/providers/not-available");
    const admin = await getCloudSupabaseAdmin("portal");

    const { data: lics } = await admin
      .from("licenses")
      .select("install_id")
      .eq("contact_email", email)
      .eq("kind", "install");
    const ids = Array.from(new Set((lics ?? []).map((l) => l.install_id)));
    if (ids.length === 0) return [];

    const { data } = await admin
      .from("installation_package_downloads")
      .select("id, install_id, kind, version, actor_email, created_at")
      .in("install_id", ids)
      .order("created_at", { ascending: false })
      .limit(200);

    return (data ?? []) as MyDownloadLogRow[];
  });
