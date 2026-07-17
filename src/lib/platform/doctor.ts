// OPSQAI Doctor — Phase 8.
//
// Structured, provider-driven operational report. Consumed by:
//   - Admin Console dashboard tile
//   - `opsqai doctor` CLI
//   - Public route  GET /api/public/doctor  (Prometheus/Uptime scrapers)
//
// The report rolls up individual probes into a green / amber / red /
// n/a status. Every probe is deliberately non-fatal — a crash inside
// one probe produces a `red` finding, never a 500. Doctor is called
// while the platform is running; it must never take a lock or block.

import {
  Capability,
  Edition,
  getActiveEdition,
  hasCapability,
} from "@/lib/platform";
import {
  getBackupService,
  getLicensingProvider,
  getSecretsCipher,
  getStorageProvider,
  getTelemetrySink,
} from "@/lib/providers";

export type DoctorSeverity = "green" | "amber" | "red" | "n/a";

export type DoctorCategory =
  | "services"
  | "disk"
  | "tls"
  | "backup"
  | "license"
  | "ai"
  | "database"
  | "storage"
  | "cipher"
  | "telemetry"
  | "fingerprint"
  | "edition";

export interface DoctorFinding {
  id: string;
  category: DoctorCategory;
  severity: DoctorSeverity;
  message: string;
  actionable?: string;
  detail?: Record<string, unknown>;
}

export interface DoctorReport {
  overall: DoctorSeverity;
  findings: DoctorFinding[];
  generatedAt: string;
}

function rollup(findings: DoctorFinding[]): DoctorSeverity {
  if (findings.some((f) => f.severity === "red")) return "red";
  if (findings.some((f) => f.severity === "amber")) return "amber";
  if (findings.every((f) => f.severity === "n/a")) return "n/a";
  return "green";
}

// --------------------------------------------------------------------
// Probes
// --------------------------------------------------------------------

async function probeLicense(): Promise<DoctorFinding> {
  if (!hasCapability(Capability.Licensing)) {
    return {
      id: "license.expiry",
      category: "license",
      severity: "n/a",
      message: "Licensing not applicable",
    };
  }
  try {
    const details = await getLicensingProvider().validate();
    const days = Math.floor(
      (new Date(details.expiresAt).getTime() - Date.now()) / 86_400_000,
    );
    if (days < 0) {
      return {
        id: "license.expiry",
        category: "license",
        severity: "red",
        message: "License has expired",
        actionable: "Renew the licence file via the Admin Console",
      };
    }
    if (days < 30) {
      return {
        id: "license.expiry",
        category: "license",
        severity: "amber",
        message: `License expires in ${days} day(s)`,
      };
    }
    return {
      id: "license.expiry",
      category: "license",
      severity: "green",
      message: `License valid (${days} days remaining)`,
    };
  } catch (err) {
    return {
      id: "license.expiry",
      category: "license",
      severity: "red",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

function probeEdition(): DoctorFinding {
  const ed = getActiveEdition();
  return {
    id: "edition.active",
    category: "edition",
    severity: "green",
    message: `Active edition: ${ed}${
      ed === Edition.Community ? " (evaluation)" : ""
    }`,
  };
}

async function probeStorage(): Promise<DoctorFinding> {
  if (!hasCapability(Capability.Storage)) {
    return {
      id: "storage.probe",
      category: "storage",
      severity: "n/a",
      message: "Storage capability not registered",
    };
  }
  try {
    const { ok, detail } = await getStorageProvider().probe();
    return {
      id: "storage.probe",
      category: "storage",
      severity: ok ? "green" : "red",
      message: ok ? "Storage read/write ok" : "Storage probe failed",
      detail: detail ? { detail } : undefined,
      actionable: ok
        ? undefined
        : "Check disk space and NTFS permissions on the storage path",
    };
  } catch (err) {
    return {
      id: "storage.probe",
      category: "storage",
      severity: "red",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

async function probeCipher(): Promise<DoctorFinding> {
  try {
    const ok = await getSecretsCipher().verifyCanary();
    return {
      id: "cipher.canary",
      category: "cipher",
      severity: ok ? "green" : "red",
      message: ok
        ? "Encryption key canary decrypts"
        : "Encryption canary mismatch",
      actionable: ok
        ? undefined
        : "Investigate DPAPI / master-key rotation — a restore may be required",
    };
  } catch (err) {
    return {
      id: "cipher.canary",
      category: "cipher",
      severity: "n/a",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

async function probeBackupFreshness(): Promise<DoctorFinding> {
  try {
    const snapshots = await getBackupService().list();
    if (!snapshots.length) {
      return {
        id: "backup.freshness",
        category: "backup",
        severity: "amber",
        message: "No snapshots recorded yet",
        actionable: "Run `opsqai backup create` or wait for the daily task",
      };
    }
    const latest = snapshots[0];
    const ageMs = Date.now() - new Date(latest.createdAt).getTime();
    const ageDays = Math.floor(ageMs / 86_400_000);
    if (ageDays > 30) {
      return {
        id: "backup.freshness",
        category: "backup",
        severity: "red",
        message: `Latest snapshot is ${ageDays} days old`,
        actionable: "Re-enable the daily backup task or run `opsqai backup create`",
      };
    }
    if (ageDays > 7) {
      return {
        id: "backup.freshness",
        category: "backup",
        severity: "amber",
        message: `Latest snapshot is ${ageDays} days old`,
      };
    }
    return {
      id: "backup.freshness",
      category: "backup",
      severity: "green",
      message: `Latest snapshot ${ageDays === 0 ? "<1" : ageDays} day(s) old (${snapshots.length} total)`,
      detail: {
        latest_id: latest.id,
        verified: Boolean(latest.verifiedAt),
      },
    };
  } catch {
    return {
      id: "backup.freshness",
      category: "backup",
      severity: "n/a",
      message: "Backup service not registered",
    };
  }
}

function probeTelemetry(): DoctorFinding {
  if (!hasCapability(Capability.Telemetry)) {
    return {
      id: "telemetry.level",
      category: "telemetry",
      severity: "n/a",
      message: "Telemetry disabled",
    };
  }
  try {
    const sink = getTelemetrySink();
    return {
      id: "telemetry.level",
      category: "telemetry",
      severity: "green",
      message: `Telemetry level: ${sink.level}`,
    };
  } catch {
    return {
      id: "telemetry.level",
      category: "telemetry",
      severity: "n/a",
      message: "Telemetry sink not registered",
    };
  }
}

async function probeDiskSpace(): Promise<DoctorFinding> {
  // Node-only probe (uses fs.statfs). Runs on Self-Hosted; on Cloud
  // the filesystem is ephemeral so it returns n/a.
  if (typeof process === "undefined" || !process.versions?.node) {
    return {
      id: "disk.free",
      category: "disk",
      severity: "n/a",
      message: "Disk probe unavailable in this runtime",
    };
  }
  const target =
    process.env.OPSQAI_STORAGE_LOCAL_PATH ||
    process.env.OPSQAI_BACKUP_DIR ||
    "";
  if (!target) {
    return {
      id: "disk.free",
      category: "disk",
      severity: "n/a",
      message: "No storage / backup path configured",
    };
  }
  try {
    const fs = await import("node:fs/promises");
    const statfs = (fs as unknown as {
      statfs?: (p: string) => Promise<{ bsize: number; bavail: number; blocks: number }>;
    }).statfs;
    if (!statfs) {
      return {
        id: "disk.free",
        category: "disk",
        severity: "n/a",
        message: "fs.statfs not available on this Node build",
      };
    }
    const info = await statfs(target);
    const freeBytes = info.bavail * info.bsize;
    const totalBytes = info.blocks * info.bsize;
    const pct = totalBytes > 0 ? freeBytes / totalBytes : 1;
    const freeGb = (freeBytes / 1024 / 1024 / 1024).toFixed(1);
    if (pct < 0.05 || freeBytes < 2 * 1024 * 1024 * 1024) {
      return {
        id: "disk.free",
        category: "disk",
        severity: "red",
        message: `Only ${freeGb} GB free on ${target}`,
        actionable: "Free disk space or prune old snapshots",
      };
    }
    if (pct < 0.15) {
      return {
        id: "disk.free",
        category: "disk",
        severity: "amber",
        message: `${freeGb} GB free on ${target} (${Math.round(pct * 100)}%)`,
      };
    }
    return {
      id: "disk.free",
      category: "disk",
      severity: "green",
      message: `${freeGb} GB free on ${target}`,
    };
  } catch (err) {
    return {
      id: "disk.free",
      category: "disk",
      severity: "n/a",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runDoctor(): Promise<DoctorReport> {
  const findings = await Promise.all([
    probeLicense(),
    Promise.resolve(probeEdition()),
    probeStorage(),
    probeCipher(),
    probeBackupFreshness(),
    Promise.resolve(probeTelemetry()),
    probeDiskSpace(),
  ]);
  return {
    overall: rollup(findings),
    findings,
    generatedAt: new Date().toISOString(),
  };
}
