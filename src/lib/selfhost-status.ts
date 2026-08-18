// Pure, shared status-derivation for self-hosted installations.
// Used by BOTH the public heartbeat ingestion endpoint and the Management
// Center UI so they can never disagree about what "Offline" means.

export type ReportedStatus = "running" | "degraded" | "updating" | "maintenance";

export type DisplayStatus =
  | "online"
  | "offline"
  | "degraded"
  | "updating"
  | "maintenance"
  | "unknown";

export const REPORTED_STATUSES: ReportedStatus[] = [
  "running",
  "degraded",
  "updating",
  "maintenance",
];

export const DISPLAY_STATUSES: DisplayStatus[] = [
  "online",
  "offline",
  "degraded",
  "updating",
  "maintenance",
  "unknown",
];

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // installer default heartbeat cadence
const OFFLINE_MISSED_INTERVALS = 3;
const UNKNOWN_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface DeriveStatusInput {
  lastHeartbeatAt: string | null | undefined;
  reportedStatus?: string | null;
  now?: number;
  heartbeatIntervalMs?: number;
}

/** Deterministic, side-effect-free status derivation. */
export function deriveInstallationStatus(input: DeriveStatusInput): DisplayStatus {
  const now = input.now ?? Date.now();
  const intervalMs = input.heartbeatIntervalMs ?? DEFAULT_INTERVAL_MS;

  if (!input.lastHeartbeatAt) return "unknown";
  const last = new Date(input.lastHeartbeatAt).getTime();
  if (Number.isNaN(last)) return "unknown";

  const age = now - last;
  if (age > UNKNOWN_AFTER_MS) return "unknown";
  if (age > intervalMs * OFFLINE_MISSED_INTERVALS) return "offline";

  const reported = (input.reportedStatus ?? "running").toLowerCase();
  if (reported === "maintenance") return "maintenance";
  if (reported === "updating") return "updating";
  if (reported === "degraded") return "degraded";
  return "online";
}

export function statusBadgeVariant(
  status: DisplayStatus,
): "default" | "outline" | "destructive" | "secondary" {
  switch (status) {
    case "online":
      return "default";
    case "offline":
      return "destructive";
    case "degraded":
      return "destructive";
    case "updating":
      return "secondary";
    case "maintenance":
      return "outline";
    case "unknown":
    default:
      return "outline";
  }
}

export function statusLabel(status: DisplayStatus): string {
  switch (status) {
    case "online":
      return "Online";
    case "offline":
      return "Offline";
    case "degraded":
      return "Degraded";
    case "updating":
      return "Updating";
    case "maintenance":
      return "Maintenance mode";
    case "unknown":
    default:
      return "Unknown";
  }
}
