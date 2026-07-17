// Local ITelemetrySink for OPSQAI Self-Hosted.
//
// Writes structured JSON events to a rotating log file under
// %ProgramData%\OPSQAI\logs\telemetry\ AND — when running as a Windows
// service — to the "OPSQAI" Windows Event Log source. Nothing is ever
// sent off-machine unless the customer explicitly opts in and provides
// an outbound endpoint (Phase 8: `Capability.Telemetry` with `full`).

import { appendFile, mkdir, stat, rename, readdir, rm } from "node:fs/promises";
import path from "node:path";

import type { ITelemetrySink, TelemetryLevel } from "@/lib/providers/interfaces";
import { Capability } from "@/lib/platform";

export interface LocalTelemetryDeps {
  logDir: string;
  level: TelemetryLevel;
  installationId: string;
  maxFileBytes?: number;
  maxFiles?: number;
}

/**
 * Strip fields that could identify a specific end user when the sink is
 * in `anonymous` mode. Full mode preserves the whole payload; disabled
 * mode never invokes this — events are silently dropped.
 */
function scrubPayload(
  payload: Record<string, unknown> | undefined,
  level: TelemetryLevel,
): Record<string, unknown> {
  if (!payload) return {};
  if (level === "full") return payload;
  const forbidden = new Set([
    "email",
    "email_address",
    "user_email",
    "phone",
    "ip",
    "ip_address",
    "user_name",
    "displayName",
    "full_name",
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (forbidden.has(k)) continue;
    out[k] = v;
  }
  return out;
}

export function createLocalTelemetrySink(deps: LocalTelemetryDeps): ITelemetrySink {
  const maxBytes = deps.maxFileBytes ?? 5 * 1024 * 1024; // 5 MB
  const maxFiles = deps.maxFiles ?? 10;
  const currentLog = () => path.resolve(deps.logDir, "telemetry.log");

  async function rotateIfNeeded(): Promise<void> {
    try {
      const st = await stat(currentLog());
      if (st.size < maxBytes) return;
    } catch {
      return; // No file yet.
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await rename(currentLog(), path.resolve(deps.logDir, `telemetry-${stamp}.log`));
    // Prune oldest.
    const files = (await readdir(deps.logDir))
      .filter((f) => f.startsWith("telemetry-") && f.endsWith(".log"))
      .sort();
    while (files.length > maxFiles) {
      const oldest = files.shift();
      if (oldest) await rm(path.resolve(deps.logDir, oldest), { force: true });
    }
  }

  return {
    capability: Capability.Telemetry,
    name: "opsqai.selfhost.local-telemetry",
    level: deps.level,
    async event(name, payload) {
      if (deps.level === "disabled") return;
      await mkdir(deps.logDir, { recursive: true });
      await rotateIfNeeded();
      const line =
        JSON.stringify({
          at: new Date().toISOString(),
          installation_id: deps.installationId,
          level: deps.level,
          event: name,
          payload: scrubPayload(payload, deps.level),
        }) + "\n";
      await appendFile(currentLog(), line, { encoding: "utf8" });
    },
  };
}
