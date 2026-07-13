// `opsqai doctor` — server-side health checks (Phase 5).
//
// Runs a fixed catalog of read-only probes against the local install and
// returns a structured report. Same check catalog powers both:
//   - Admin → Platform → Doctor UI
//   - the `opsqai doctor` CLI (which just calls this via the same server fn)
//
// Every check is designed to be safe to run at any time and returns a
// concise, non-secret status. Doctor never logs env values or tokens.

import { listAdapters, getActiveAdapter } from "@/lib/ai-adapters";

export type DoctorStatus = "ok" | "warn" | "fail" | "skip";

export interface DoctorCheckResult {
  id: string;
  label: string;
  status: DoctorStatus;
  detail?: string;
}

export interface DoctorReport {
  install_id: string | null;
  installer_version: string | null;
  mode: "cloud" | "selfhost";
  ran_at: string;
  overall: DoctorStatus;
  checks: DoctorCheckResult[];
}

function worst(a: DoctorStatus, b: DoctorStatus): DoctorStatus {
  const rank: Record<DoctorStatus, number> = { ok: 0, skip: 0, warn: 1, fail: 2 };
  return rank[a] >= rank[b] ? a : b;
}

async function checkDatabase(): Promise<DoctorCheckResult> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("platform_config").select("id").limit(1);
    if (error)
      return { id: "db", label: "Database reachable", status: "fail", detail: error.message };
    return { id: "db", label: "Database reachable", status: "ok" };
  } catch (e) {
    return { id: "db", label: "Database reachable", status: "fail", detail: (e as Error).message };
  }
}

async function checkSigningKeys(): Promise<DoctorCheckResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("license_signing_keys")
    .select("key_id, active")
    .eq("active", true)
    .limit(1);
  if (error)
    return {
      id: "signing_keys",
      label: "License signing keys",
      status: "fail",
      detail: error.message,
    };
  if (!data?.length) {
    return {
      id: "signing_keys",
      label: "License signing keys",
      status: "warn",
      detail: "No active signing key. Management Center will auto-generate one on first issue.",
    };
  }
  return {
    id: "signing_keys",
    label: "License signing keys",
    status: "ok",
    detail: `active key: ${data[0].key_id}`,
  };
}

function checkAiProvider(): DoctorCheckResult {
  try {
    const active = getActiveAdapter();
    const all = listAdapters()
      .map((a) => a.id)
      .join(", ");
    return {
      id: "ai",
      label: "AI provider registered",
      status: "ok",
      detail: `active=${active.id}, registered=[${all}]`,
    };
  } catch (e) {
    return {
      id: "ai",
      label: "AI provider registered",
      status: "fail",
      detail: (e as Error).message,
    };
  }
}

async function checkPlatformAdmin(): Promise<DoctorCheckResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "platform_admin")
    .limit(1);
  if (error)
    return { id: "admin", label: "Platform admin present", status: "fail", detail: error.message };
  if (!data?.length) {
    return {
      id: "admin",
      label: "Platform admin present",
      status: "fail",
      detail: "No user holds the platform_admin role. Bootstrap one before finishing setup.",
    };
  }
  return { id: "admin", label: "Platform admin present", status: "ok" };
}

async function checkInstallLicense(mode: "cloud" | "selfhost"): Promise<DoctorCheckResult> {
  if (mode === "cloud") {
    return {
      id: "install_license",
      label: "Installation License",
      status: "skip",
      detail: "Cloud mode — not applicable",
    };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("licenses")
    .select("install_id, revoked, expires_at")
    .eq("kind", "install")
    .limit(1);
  if (error)
    return {
      id: "install_license",
      label: "Installation License",
      status: "fail",
      detail: error.message,
    };
  if (!data?.length) {
    return {
      id: "install_license",
      label: "Installation License",
      status: "fail",
      detail: "No Installation License imported. Paste one under Platform → License Activation.",
    };
  }
  const row = data[0];
  if (row.revoked)
    return {
      id: "install_license",
      label: "Installation License",
      status: "fail",
      detail: "License revoked.",
    };
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return {
      id: "install_license",
      label: "Installation License",
      status: "fail",
      detail: "License expired.",
    };
  }
  return {
    id: "install_license",
    label: "Installation License",
    status: "ok",
    detail: `install_id=${row.install_id}`,
  };
}

async function checkHeartbeat(mode: "cloud" | "selfhost"): Promise<DoctorCheckResult> {
  if (mode === "cloud") {
    return {
      id: "heartbeat",
      label: "Heartbeat to license server",
      status: "skip",
      detail: "Cloud mode — not applicable",
    };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("license_installs")
    .select("last_heartbeat_at")
    .limit(1);
  const last = data?.[0]?.last_heartbeat_at;
  if (!last) {
    return {
      id: "heartbeat",
      label: "Heartbeat to license server",
      status: "warn",
      detail: "No heartbeat recorded yet.",
    };
  }
  const ageH = (Date.now() - new Date(last).getTime()) / 3_600_000;
  if (ageH > 48) {
    return {
      id: "heartbeat",
      label: "Heartbeat to license server",
      status: "warn",
      detail: `Last heartbeat ${ageH.toFixed(1)}h ago.`,
    };
  }
  return {
    id: "heartbeat",
    label: "Heartbeat to license server",
    status: "ok",
    detail: `${ageH.toFixed(1)}h ago`,
  };
}

function resolveMode(): "cloud" | "selfhost" {
  return process.env.OPSQAI_MODE === "selfhost" ? "selfhost" : "cloud";
}

export async function runDoctorReport(): Promise<DoctorReport> {
  const mode = resolveMode();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cfg } = await supabaseAdmin
    .from("platform_config")
    .select("install_id, installer_version")
    .eq("id", true)
    .maybeSingle();

  const checks: DoctorCheckResult[] = [];
  checks.push(await checkDatabase());
  checks.push(await checkSigningKeys());
  checks.push(checkAiProvider());
  checks.push(await checkPlatformAdmin());
  checks.push(await checkInstallLicense(mode));
  checks.push(await checkHeartbeat(mode));

  const overall = checks.reduce<DoctorStatus>((acc, c) => worst(acc, c.status), "ok");
  return {
    install_id: cfg?.install_id ?? null,
    installer_version: cfg?.installer_version ?? null,
    mode,
    ran_at: new Date().toISOString(),
    overall,
    checks,
  };
}
