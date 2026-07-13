// First-Run Wizard server-only helpers (Phase 5).
//
// The wizard at /first-run is a PUBLIC route that is reachable only when
// this install has zero platform admins. Once ANY user holds
// `platform_owner` or `platform_admin`, the gate flips closed permanently —
// a lost admin uses the DR break-glass flow, not this route.
//
// Secret handling (AI/SMTP passwords, API keys) follows the approved
// architecture: values are appended to a chmod 600 `secrets.env` file on
// the customer-owned data volume. `docker/entrypoint.sh` sources it at
// container start so the app reads them via `process.env`. The wizard NEVER
// stores raw secrets in the database — only non-secret identifiers
// (host, port, provider kind, bucket name, etc.).

import { promises as fs } from "node:fs";
import path from "node:path";

export interface FirstRunGate {
  open: boolean;
  reason:
    | "open"
    | "not_selfhost"
    | "admin_exists"
    | "setup_completed"
    | "db_error";
  detail?: string;
}

/**
 * Single source of truth for the first-run gate.
 * `open=true` iff selfhost mode AND no platform_owner/platform_admin exists
 * AND `platform_config.setup_completed_at` is null.
 */
export async function evaluateFirstRunGate(): Promise<FirstRunGate> {
  if (process.env.OPSQAI_MODE !== "selfhost") {
    return { open: false, reason: "not_selfhost" };
  }
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .in("role", ["platform_owner", "platform_admin"]);
    if (countErr) return { open: false, reason: "db_error", detail: countErr.message };
    if ((count ?? 0) > 0) return { open: false, reason: "admin_exists" };

    const { data: cfg, error: cfgErr } = await supabaseAdmin
      .from("platform_config")
      .select("setup_completed_at")
      .eq("id", true)
      .maybeSingle();
    if (cfgErr) return { open: false, reason: "db_error", detail: cfgErr.message };
    if (cfg?.setup_completed_at) return { open: false, reason: "setup_completed" };

    return { open: true, reason: "open" };
  } catch (e) {
    return { open: false, reason: "db_error", detail: (e as Error).message };
  }
}

/**
 * Guard used by every state-changing wizard server fn.
 * Throws if the gate is closed (defense in depth — client-side redirect is
 * not enough; a direct RPC POST must also be rejected).
 */
export async function assertFirstRunOpen(): Promise<void> {
  const gate = await evaluateFirstRunGate();
  if (!gate.open) {
    throw new Error(`Forbidden: first-run setup is closed (${gate.reason})`);
  }
}

/**
 * Location of the runtime-writable secrets file. Overridable via
 * `OPSQAI_SECRETS_ENV_PATH` for tests / non-default deployments; defaults
 * to `/var/lib/opsqai/secrets.env`, which docker-compose mounts as the
 * customer's data volume.
 */
export function secretsEnvPath(): string {
  return process.env.OPSQAI_SECRETS_ENV_PATH || "/var/lib/opsqai/secrets.env";
}

const SECRET_NAME_RE = /^[A-Z_][A-Z0-9_]{2,63}$/;

function serializeValue(value: string): string {
  // Wrap in single quotes and escape embedded single quotes for POSIX shell.
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * Merge new secret entries into `secrets.env`, preserving unrelated lines.
 * File is written with 0600 permissions (only the container runtime user
 * can read it). Never logs values.
 *
 * The caller MUST validate that every KEY belongs to a known whitelist —
 * this helper only enforces the shell-safety of the file format.
 */
export async function writeSecretsEnv(
  updates: Record<string, string>,
): Promise<void> {
  const target = secretsEnvPath();
  await fs.mkdir(path.dirname(target), { recursive: true }).catch(() => {});

  let existing = "";
  try {
    existing = await fs.readFile(target, "utf8");
  } catch {
    existing = `# OPSQAI runtime secrets — written by the first-run wizard.\n# Sourced by docker/entrypoint.sh at container start.\n# DO NOT edit while the wizard is running.\n`;
  }

  const lines = existing.split("\n");
  const seen = new Set<string>();

  for (const rawKey of Object.keys(updates)) {
    const key = rawKey.toUpperCase();
    if (!SECRET_NAME_RE.test(key)) {
      throw new Error(`Invalid secret name: ${rawKey}`);
    }
    seen.add(key);
    const value = updates[rawKey] ?? "";
    const rendered = `${key}=${serializeValue(value)}`;
    const idx = lines.findIndex((l) => l.match(new RegExp(`^${key}=`)));
    if (idx >= 0) lines[idx] = rendered;
    else lines.push(rendered);
  }

  const content = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  await fs.writeFile(target, content.endsWith("\n") ? content : content + "\n", {
    mode: 0o600,
  });
  // Best-effort chmod in case the file existed with looser permissions.
  await fs.chmod(target, 0o600).catch(() => {});
}
