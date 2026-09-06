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
      const current_version = sh?.app_version ?? li?.app_version ?? null;
      const downloads = downloadsByInstall.get(install_id) ?? [];
      return {
        install_id,
        organization_name: sh?.organization_name ?? null,
        current_version,
        installer_version: li?.installer_version ?? null,
        latest_version: latest,
        behind: Boolean(current_version && latest && current_version !== latest),
        last_heartbeat_at: sh?.last_heartbeat_at ?? li?.last_heartbeat_at ?? null,
        last_download_at: downloads[0]?.created_at ?? null,
        download_count: downloads.length,
        downloads: downloads.slice(0, 10),
      };
    });
  });
