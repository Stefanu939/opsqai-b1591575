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
        installation_id: String(lic.claims.install_id ?? "").trim(),
        signed_token: lic.installRaw,
        // The Management Center compares plain semver, never a "v" prefix.
        current_version: APP_VERSION.replace(/^v/i, ""),
        channel,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  if (res.status === 401) return { ok: false, reason: "unauthorized" };
  if (!res.ok) {
    // Surface the server's own explanation so the UI can be specific instead
    // of showing a bare status code.
    let detail = "";
    try {
      const parsed = (await res.json()) as { error?: string; fields?: string[] };
      detail = [parsed.error, parsed.fields?.join(",")].filter(Boolean).join(":");
    } catch {
      /* non-JSON error body */
    }
    return { ok: false, reason: detail ? `http_${res.status}_${detail}` : `http_${res.status}` };
  }

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

// ---------------------------------------------------------------------------
// In-application download with live progress.
//
// The Windows updater service can stage releases on its own, but when it is
// stopped (or between poll cycles) the operator would see no feedback at all
// after pressing "Download now". The application therefore downloads the
// verified package itself and writes the same progress.json the UI reads, so a
// progress bar always appears immediately.
// ---------------------------------------------------------------------------

export function progressPath(): string | null {
  const dir = updatesDir();
  return dir ? join(dir, "progress.json") : null;
}

type ProgressPhase = "downloading" | "verified" | "installing" | "done" | "failed";

export async function writeUpdateProgress(p: {
  phase: ProgressPhase;
  version?: string | null;
  received?: number;
  total?: number;
  error?: string | null;
}): Promise<void> {
  const file = progressPath();
  if (!file) return;
  await writeJson(file, {
    phase: p.phase,
    version: p.version ?? null,
    received: p.received ?? 0,
    total: p.total ?? 0,
    error: p.error ?? null,
    at: new Date().toISOString(),
  }).catch(() => undefined);
}

let downloadInFlight: string | null = null;
/** Last moment bytes actually arrived, used to notice a dead connection. */
let downloadHeartbeat = 0;
/** A download with no bytes for this long is treated as stalled, not running. */
export const STALL_MS = 90_000;

/**
 * Peer distribution settings. When several installations share one customer
 * server, only the first one needs to reach the internet: the others fetch the
 * already verified package from it over the LAN. Off by default so an isolated
 * installation behaves exactly as before.
 */
export interface PeerUpdateSettings {
  /** Serve verified packages to other installs on this server. */
  serve: boolean;
  /** Base URL of the peer to fetch from, e.g. http://opsqai-host:8080 */
  source: string | null;
  /** Shared secret both sides must present. */
  token: string | null;
}

export async function readPeerUpdateSettings(): Promise<PeerUpdateSettings> {
  try {
    const { readSelfHostConfig } = await import("@/lib/selfhost-config.server");
    const u = (readSelfHostConfig()["updates"] as Record<string, unknown> | undefined) ?? {};
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    return {
      serve: u["peerServe"] === true,
      source: str(u["peerSource"])?.replace(/\/+$/, "") ?? null,
      token: str(u["peerToken"]),
    };
  } catch {
    return { serve: false, source: null, token: null };
  }
}

/** Fetch the package from the LAN peer first, falling back to the signed URL. */
async function fetchUpdateBody(update: AvailableUpdate): Promise<Response> {
  const peer = await readPeerUpdateSettings();
  if (peer.source && peer.token) {
    try {
      const res = await fetch(
        `${peer.source}/api/public/v1/updates/peer-package?version=${encodeURIComponent(update.version)}`,
        {
          headers: { "x-opsqai-peer-token": peer.token },
          signal: AbortSignal.timeout(30 * 60_000),
        },
      );
      if (res.ok && res.body) return res;
    } catch {
      /* peer unavailable — use the internet source */
    }
  }
  return fetch(update.url, { signal: AbortSignal.timeout(30 * 60_000) });
}

/** Path of the locally stored, verified package for a version (if any). */
export async function storedPackage(
  version: string,
): Promise<{ path: string; sha256: string; size: number; artifact: string } | null> {
  const dir = updatesDir();
  if (!dir) return null;
  try {
    const parsed = JSON.parse(
      (await readFile(join(dir, "downloaded.json"), "utf8")).replace(/^\uFEFF/, ""),
    ) as { version?: string; path?: string; sha256?: string; size?: number; artifact?: string };
    if (parsed.version !== version || !parsed.path || !parsed.sha256) return null;
    return {
      path: parsed.path,
      sha256: parsed.sha256,
      size: parsed.size ?? 0,
      artifact: parsed.artifact ?? "zip",
    };
  } catch {
    return null;
  }
}

/**
 * Accept a package the operator downloaded manually (e.g. from the website)
 * and stage it for installation. The bytes are only accepted when their
 * SHA-256 matches the signed descriptor of the discovered release, so a
 * swapped or corrupted file can never be installed.
 */
export async function stageUpdateFromFile(
  bytes: Uint8Array,
  filename: string,
): Promise<{ ok: true; version: string } | { ok: false; reason: string }> {
  const dir = updatesDir();
  if (!dir) return { ok: false, reason: "no_update_folder" };
  const update = await readAvailableUpdate();
  if (!update) return { ok: false, reason: "no_known_release" };
  if (!update.sha256) return { ok: false, reason: "no_checksum" };

  const { createHash } = await import("node:crypto");
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== update.sha256.toLowerCase()) return { ok: false, reason: "checksum_mismatch" };

  const ext = /\.exe$/i.test(filename) ? "exe" : "zip";
  const target = join(dir, "packages", `opsqai-${update.version}.${ext}`);
  await mkdir(dirname(target), { recursive: true });
  const tmp = `${target}.part`;
  const { writeFile: write, rename } = await import("node:fs/promises");
  await write(tmp, Buffer.from(bytes));
  await rename(tmp, target);
  await writeJson(join(dir, "downloaded.json"), {
    version: update.version,
    artifact: ext,
    path: target,
    sha256: digest,
    size: bytes.byteLength,
    at: new Date().toISOString(),
    source: "manual-file",
  }).catch(() => undefined);
  await writeUpdateProgress({
    phase: "verified",
    version: update.version,
    received: bytes.byteLength,
    total: bytes.byteLength,
  });
  return { ok: true, version: update.version };
}

/**
 * Download the verified release package into the local packages folder,
 * reporting byte progress the whole way. Resolves when the file is stored and
 * its checksum verified; never throws (failures land in progress.json).
 */
export async function downloadAvailableUpdate(version?: string): Promise<boolean> {
  const dir = updatesDir();
  const update = await readAvailableUpdate();
  if (!dir || !update) return false;
  if (version && update.version !== version) return false;
  // A download that died with the process (service restart, machine sleep) used
  // to keep the version marked as in flight, so pressing "Download now" again
  // did nothing. Only a download that is still moving blocks a retry.
  if (downloadInFlight === update.version && Date.now() - downloadHeartbeat < STALL_MS) return true;
  downloadInFlight = update.version;
  downloadHeartbeat = Date.now();

  await writeUpdateProgress({
    phase: "downloading",
    version: update.version,
    received: 0,
    total: update.size ?? 0,
  });

  try {
    const { createHash } = await import("node:crypto");
    const { writeFile: write, mkdir: makeDir, rename } = await import("node:fs/promises");
    const res = await fetchUpdateBody(update);
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

    const len = Number(res.headers.get("content-length"));
    const total = Number.isFinite(len) && len > 0 ? len : (update.size ?? 0);
    const hash = createHash("sha256");
    const chunks: Uint8Array[] = [];
    let received = 0;
    let lastWrite = 0;

    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      chunks.push(value);
      hash.update(value);
      received += value.byteLength;
      const now = Date.now();
      if (now - lastWrite > 700) {
        lastWrite = now;
        await writeUpdateProgress({
          phase: "downloading",
          version: update.version,
          received,
          total,
        });
      }
    }

    const digest = hash.digest("hex");
    if (update.sha256 && digest !== update.sha256.toLowerCase()) {
      throw new Error("The downloaded package did not match its checksum and was discarded.");
    }

    const target = join(
      dir,
      "packages",
      `opsqai-${update.version}.${update.artifact === "exe" ? "exe" : "zip"}`,
    );
    await makeDir(dirname(target), { recursive: true });
    const tmp = `${target}.part`;
    await write(tmp, Buffer.concat(chunks.map((c) => Buffer.from(c))));
    await rename(tmp, target);

    await writeJson(join(dir, "downloaded.json"), {
      version: update.version,
      artifact: update.artifact,
      path: target,
      sha256: digest,
      size: received,
      at: new Date().toISOString(),
    }).catch(() => undefined);

    await writeUpdateProgress({
      phase: "verified",
      version: update.version,
      received,
      total: total || received,
    });
    return true;
  } catch (e) {
    await writeUpdateProgress({
      phase: "failed",
      version: update.version,
      error: e instanceof Error ? e.message : String(e),
    });
    return false;
  } finally {
    downloadInFlight = null;
  }
}
