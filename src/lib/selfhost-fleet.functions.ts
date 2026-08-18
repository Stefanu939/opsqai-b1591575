// Management Center: read-only fleet visibility for self-hosted installs.
// Platform-admin only. No remote control actions live here — visibility only.

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { deriveInstallationStatus, type DisplayStatus } from "@/lib/selfhost-status";

export interface SelfHostFleetRow {
  install_id: string;
  organization_name: string | null;
  country: string | null;
  primary_language: string | null;
  enabled_modules: string[];
  reported_status: string | null;
  license_status: string | null;
  last_maintenance_at: string | null;
  next_maintenance_at: string | null;
  last_heartbeat_at: string | null;
  app_version: string | null;
  display_status: DisplayStatus;
}

export const listSelfHostFleet = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<SelfHostFleetRow[]> => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("selfhost-fleet");
    const { data, error } = await supabaseAdmin
      .from("selfhost_installations")
      .select(
        "install_id, organization_name, country, primary_language, enabled_modules, reported_status, license_status, last_maintenance_at, next_maintenance_at, last_heartbeat_at, app_version",
      )
      .order("last_heartbeat_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);

    const now = Date.now();
    return (data ?? []).map((row) => ({
      ...row,
      enabled_modules: Array.isArray(row.enabled_modules) ? (row.enabled_modules as string[]) : [],
      display_status: deriveInstallationStatus({
        lastHeartbeatAt: row.last_heartbeat_at,
        reportedStatus: row.reported_status,
        now,
      }),
    }));
  });
