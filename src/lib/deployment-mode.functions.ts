import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
// Phase 6 — Deployment mode server API.
//
// Exposes the runtime deployment mode + platform_config anchors to the
// client so the app shell can gate operational vs MC-only routes without
// hard-coding it into the build.

import { createServerFn } from "@tanstack/react-start";
import type { DeploymentMode } from "@/lib/deployment-mode";

export const getDeploymentInfo = createServerFn({ method: "GET" }).handler(async () => {
  const mode: DeploymentMode = process.env.OPSQAI_MODE === "selfhost" ? "selfhost" : "mc";
  let installId: string | null = null;
  let installerVersion: string | null = null;
  try {
    const supabaseAdmin = await getCloudSupabaseAdmin("deployment-mode");
    const { data } = await supabaseAdmin
      .from("platform_config")
      .select("install_id, installer_version")
      .eq("id", true)
      .maybeSingle();
    installId = data?.install_id ?? null;
    installerVersion = data?.installer_version ?? null;
  } catch {
    // platform_config may not exist during early bootstrap; safe to ignore.
  }
  return { mode, install_id: installId, installer_version: installerVersion };
});
