// Self-Hosted update discovery against the Management Center.
//
// The application (which already holds the signed license and the pinned
// license public key) asks the Management Center whether a newer published
// release exists for its channel. The answer's signed descriptor is verified
// locally with the pinned key and cross-checked against the plain JSON, so a
// tampered proxy cannot point the installation at a foreign artifact.
//
// The verified result is written to %ProgramData%\OPSQAI\updates\available.json.
// The Windows updater service reads that file first (Management Center as
// source of truth) and only falls back to the legacy signed CDN manifest when
// no descriptor is present — isolated installations keep working.

import { createPublicKey, type KeyObject } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { readInstallLicenseForHeartbeat } from "./local-licensing.server";
import { verifyCompactToken } from "./local-licensing.server";
import { APP_VERSION } from "@/lib/app-version";
import { isNewerVersion } from "@/lib/update-version";

export interface AvailableUpdate {
  version: string;
  channel: string;
  notes: string;
  url: string;
  sha256: string | null;
  size: number | null;
  artifact: "exe" | "zip";
  descriptor: string;
  discoveredAt: string;
  source: "management-center";
}

export type UpdateCheckResult =
  | { ok: true; update: AvailableUpdate }
  | { ok: false; reason: string };

export function updatesDir(): string | null {
  const cfgDir = process.env["OPSQAI_CONFIG_DIR"];
  if (!cfgDir) return null;
  return join(cfgDir, "..", "updates");
}

export function availablePath(): string | null {
  const dir = updatesDir();
  return dir ? join(dir, "available.json") : null;
}

export function commandPath(): string | null {
  const dir = updatesDir();
  return dir ? join(dir, "command.json") : null;
}

async function licensePublicKey(): Promise<KeyObject | null> {
  const path =
    process.env["OPSQAI_LICENSE_PUBLIC_KEY_PATH"] ??
    "C:/ProgramData/OPSQAI/config/keys/license-verify.pub";
  try {
    return createPublicKey(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function licenseFilePath(): string {
  return (
    process.env["OPSQAI_LICENSE_FILE_PATH"] ?? "C:/ProgramData/OPSQAI/config/license.opsqai"
  );
}

function mcBaseUrl(): string {
  const raw =
    process.env["OPSQAI_MC_URL"] ?? process.env["OPSQAI_HEARTBEAT_URL"] ?? "https://opsqai.de";
  return raw.trim().replace(/\/+$/, "");
}

/** Read the last verified descriptor written by a previous check. */
export async function readAvailableUpdate(): Promise<AvailableUpdate | null> {
  const file = availablePath();
  if (!file) return null;
  try {
    const parsed = JSON.parse((await readFile(file, "utf8")).replace(/^\uFEFF/, "")) as
      | AvailableUpdate
      | null;
    if (!parsed?.version || !parsed.url) return null;
    return isNewerVersion(parsed.version, APP_VERSION) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

/**
 * Ask the Management Center for a newer release. Never throws; every failure
 * is reported as a reason string so the UI can explain it.
 */
export async function checkForUpdateFromMc(
  channel: "stable" | "beta",
  fetchImpl: typeof fetch = fetch,
): Promise<UpdateCheckResult> {
  const key = await licensePublicKey();
  if (!key) return { ok: false, reason: "license_key_missing" };

  const lic = await readInstallLicenseForHeartbeat(licenseFilePath(), key);
  if (!lic) return { ok: false, reason: "license_missing" };

  let res: Response;
  try {
    res = await fetchImpl(`${mcBaseUrl()}/api/public/v1/updates/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        installation_id: lic.claims.install_id,
        signed_token: lic.installRaw,
        current_version: APP_VERSION,
        channel,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  if (res.status === 401) return { ok: false, reason: "unauthorized" };
  if (!res.ok) return { ok: false, reason: `http_${res.status}` };

  let body: {
    update?: {
      version?: string;
      channel?: string;
      notes?: string;
      url?: string;
      sha256?: string | null;
      size?: number | null;
      artifact?: string;
      descriptor?: string;
    } | null;
    reason?: string;
  };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    return { ok: false, reason: "invalid_response" };
  }

  if (!body.update) {
    const file = availablePath();
    if (file) await writeJson(file, null).catch(() => undefined);
    return { ok: false, reason: body.reason ?? "up_to_date" };
  }

  const u = body.update;
  if (!u.descriptor || !u.version || !u.url) return { ok: false, reason: "invalid_response" };

  // Signature + cross-check: the descriptor is the authority, the plain
  // fields are only a convenience copy.
  let claims: {
    kind?: string;
    install_id?: string;
    version?: string;
    url?: string;
    sha256?: string | null;
    size?: number | null;
    notes?: string;
    channel?: string;
    expires_at?: number;
  };
  try {
    claims = verifyCompactToken(u.descriptor, key) as typeof claims;
  } catch {
    return { ok: false, reason: "bad_signature" };
  }
  if (claims.kind !== "update") return { ok: false, reason: "wrong_kind" };
  if (claims.install_id !== lic.claims.install_id) return { ok: false, reason: "install_mismatch" };
  if (typeof claims.expires_at === "number" && claims.expires_at * 1000 < Date.now()) {
    return { ok: false, reason: "descriptor_expired" };
  }
  if (claims.version !== u.version || claims.url !== u.url) {
    return { ok: false, reason: "descriptor_mismatch" };
  }
  if (!isNewerVersion(claims.version, APP_VERSION)) return { ok: false, reason: "up_to_date" };

  const update: AvailableUpdate = {
    version: claims.version,
    channel: claims.channel ?? channel,
    notes: claims.notes ?? u.notes ?? "",
    url: claims.url,
    sha256: claims.sha256 ?? null,
    size: claims.size ?? null,
    artifact: u.artifact === "exe" ? "exe" : "zip",
    descriptor: u.descriptor,
    discoveredAt: new Date().toISOString(),
    source: "management-center",
  };

  const file = availablePath();
  if (file) await writeJson(file, update).catch(() => undefined);
  return { ok: true, update };
}

/**
 * Hand a manual instruction to the updater service. The service polls this
 * file, so a click in the application starts a download or installation
 * without waiting for the nightly window.
 */
export async function writeUpdateCommand(
  action: "check" | "download" | "install",
  version?: string,
): Promise<boolean> {
  const file = commandPath();
  if (!file) return false;
  try {
    await writeJson(file, {
      action,
      version: version ?? null,
      requestedAt: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}
