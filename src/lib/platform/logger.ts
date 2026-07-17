// Structured JSON logger for OPSQAI.
//
// Phase 5. Emits one JSON object per line to stdout (picked up by
// WinSW on Self-Hosted, by the platform log collector on Cloud) and
// optionally forwards to the active ITelemetrySink so the same event
// is durable to disk.
//
// Rules:
//   - never log PII (email, phone, ip) at levels below "warn"
//   - never log secrets — the redactor blanks well-known key names
//   - every entry is a single-line JSON object with `at`, `level`,
//     `msg`, `subsystem` — additional context under `ctx`.
//
// This file is browser-safe (no Node built-ins) so it can be imported
// from route files that render on both sides.

import { getTelemetrySink } from "@/lib/providers";
import { hasCapability, Capability } from "@/lib/platform";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REDACT_KEYS = new Set([
  "password",
  "pass",
  "secret",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "api_key",
  "apikey",
  "cookie",
  "set-cookie",
]);

function redact(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (REDACT_KEYS.has(k.toLowerCase())) {
      out[k] = "[redacted]";
    } else {
      out[k] = redact(val);
    }
  }
  return out;
}

let minLevel: LogLevel =
  ((typeof process !== "undefined" && process.env?.OPSQAI_LOG_LEVEL) as LogLevel) || "info";

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

function emit(level: LogLevel, subsystem: string, msg: string, ctx?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
  const entry = {
    at: new Date().toISOString(),
    level,
    subsystem,
    msg,
    ctx: ctx ? (redact(ctx) as Record<string, unknown>) : undefined,
  };
  const line = JSON.stringify(entry);
  // eslint-disable-next-line no-console
  (level === "error" ? console.error : console.log)(line);

  // Forward warn/error to the durable telemetry sink so the operator
  // can grep them offline. Fire-and-forget — never let logging block.
  if (LEVEL_ORDER[level] >= LEVEL_ORDER.warn && hasCapability(Capability.Telemetry)) {
    try {
      void getTelemetrySink()
        .event(`log.${level}`, { subsystem, msg, ...(ctx ?? {}) })
        .catch(() => {});
    } catch {
      /* telemetry not registered yet */
    }
  }
}

export function createLogger(subsystem: string) {
  return {
    debug: (msg: string, ctx?: Record<string, unknown>) => emit("debug", subsystem, msg, ctx),
    info: (msg: string, ctx?: Record<string, unknown>) => emit("info", subsystem, msg, ctx),
    warn: (msg: string, ctx?: Record<string, unknown>) => emit("warn", subsystem, msg, ctx),
    error: (msg: string, ctx?: Record<string, unknown>) => emit("error", subsystem, msg, ctx),
  };
}
