// Self-Hosted → Management Center heartbeat sender (Phase 4).
//
// Fully fail-open: this module NEVER throws into the caller and never
// blocks anything else in the app. On any failure it logs locally and
// retries later with exponential backoff + jitter. No customer content or
// personal data is included in the payload — only install-level metadata
// already visible to the license the customer activated with.

import type { KeyObject } from "node:crypto";
import { HeartbeatPayloadSchema, type HeartbeatPayload } from "@/lib/selfhost-heartbeat-schema";
import { readInstallLicenseForHeartbeat } from "./local-licensing.server";
import { readSelfHostConfig } from "@/lib/selfhost-config.server";
import { getLicensingProvider } from "@/lib/providers/registry";

export interface HeartbeatLogger {
  info: (msg: string) => void;
  warn: (msg: string, err?: unknown) => void;
}

export interface HeartbeatSenderOptions {
  installId: string;
  licenseFilePath: string;
  licensePublicKey: KeyObject;
  /** Management Center base URL, e.g. https://mc.opsqai.de. Empty/undefined disables sending. */
  mcBaseUrl?: string;
  enabled?: boolean;
  intervalMs?: number;
  appVersion?: string;
  fetchImpl?: typeof fetch;
  logger?: HeartbeatLogger;
}

export const DEFAULT_HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const MAX_BACKOFF_MS = 30 * 60 * 1000;
const FIRST_BEAT_DELAY_CAP_MS = 30_000;

function jitter(ms: number): number {
  const spread = ms * 0.2;
  return Math.max(1000, ms + (Math.random() * spread * 2 - spread));
}

function toIso(sec: number | null | undefined): string | null {
  return typeof sec === "number" && sec > 0 ? new Date(sec * 1000).toISOString() : null;
}

async function buildPayload(opts: HeartbeatSenderOptions): Promise<HeartbeatPayload | null> {
  const lic = await readInstallLicenseForHeartbeat(opts.licenseFilePath, opts.licensePublicKey);
  if (!lic) return null; // no valid license on disk — nothing safe to report yet

  let licenseStatus: HeartbeatPayload["license_status"] = "licensed";
  let modules: string[] = [];
  try {
    const entitlements = await getLicensingProvider().entitlements();
    modules = entitlements.modules ?? [];
    if (entitlements.revoked) licenseStatus = "revoked";
    else if (
      entitlements.status &&
      entitlements.status !== "licensed" &&
      entitlements.status !== "unlimited"
    ) {
      licenseStatus = entitlements.status as HeartbeatPayload["license_status"];
    }
  } catch {
    // Best-effort — an entitlements read failure must never block the beat.
  }

  const cfg = readSelfHostConfig();

  const candidate = {
    installation_id: opts.installId,
    signed_token: lic.installRaw,
    organization_name: cfg.company?.name ?? undefined,
    country: process.env.OPSQAI_COUNTRY ?? undefined,
    primary_language: process.env.OPSQAI_PRIMARY_LANGUAGE ?? undefined,
    app_version: opts.appVersion ?? process.env.OPSQAI_APP_VERSION ?? undefined,
    license_status: licenseStatus,
    enabled_modules: modules,
    status: "running" as const,
    last_maintenance_at: null,
    next_maintenance_at: toIso(lic.claims.maintenance_expires_at ?? null),
    timestamp: new Date().toISOString(),
  };

  const parsed = HeartbeatPayloadSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

async function sendOnce(opts: HeartbeatSenderOptions, logger: HeartbeatLogger): Promise<boolean> {
  const base = (opts.mcBaseUrl ?? "").trim().replace(/\/+$/, "");
  if (!base) return false;

  const payload = await buildPayload(opts).catch(() => null);
  if (!payload) {
    logger.info("[selfhost-heartbeat] no valid license on disk; skipping this cycle");
    return false;
  }

  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(`${base}/api/public/selfhost-heartbeat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      logger.warn(`[selfhost-heartbeat] Management Center responded with ${res.status}`);
      return false;
    }
    return true;
  } catch (e) {
    // Air-gapped / offline installs must keep working — this is best-effort only.
    logger.warn("[selfhost-heartbeat] send failed (fail-open, app unaffected)", e);
    return false;
  }
}

interface RunningSender {
  stop: () => void;
}

let running: RunningSender | null = null;

/**
 * Start the periodic heartbeat sender. Idempotent: a second call is a
 * no-op unless `stopHeartbeatSender()` was called first. Safe to call even
 * when disabled/misconfigured — it simply never schedules anything.
 */
export function startHeartbeatSender(opts: HeartbeatSenderOptions): void {
  if (running) return;
  if (opts.enabled === false) return;
  if (!opts.mcBaseUrl) return;

  const logger = opts.logger ?? { info: () => {}, warn: (msg, err) => console.warn(msg, err) };
  const baseInterval = opts.intervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
  let backoff = baseInterval;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const tick = async () => {
    if (stopped) return;
    const ok = await sendOnce(opts, logger).catch(() => false);
    if (stopped) return;
    backoff = ok ? baseInterval : Math.min(backoff * 2, MAX_BACKOFF_MS);
    timer = setTimeout(tick, jitter(backoff));
  };

  // Stagger the first beat so a fleet of simultaneous restarts doesn't
  // thunder onto the Management Center at once.
  timer = setTimeout(tick, jitter(Math.min(baseInterval, FIRST_BEAT_DELAY_CAP_MS)));

  running = {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

/** Stop the sender (tests / graceful shutdown). Safe to call when not running. */
export function stopHeartbeatSender(): void {
  running?.stop();
  running = null;
}
