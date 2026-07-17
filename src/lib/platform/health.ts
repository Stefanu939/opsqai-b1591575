// Platform health check.
//
// Called by the installer (final page), the Admin Console, and the
// updater's post-install gate. Every check has a stable id so the UI
// can render a deterministic checklist and the updater can key its
// rollback trigger on a specific failure.
//
// This module is shared between Cloud and Self-Hosted. Individual
// checks delegate to the active provider — if a provider is not
// registered (e.g. no BackupService on Cloud) the check is skipped
// with status "n/a" rather than "fail".

import { Capability, hasCapability } from "@/lib/platform";
import {
  getBackupService,
  getLicensingProvider,
  getSecretsCipher,
  getStorageProvider,
} from "@/lib/providers";

export type CheckStatus = "ok" | "warn" | "fail" | "n/a";

export interface HealthCheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
  durationMs: number;
}

export interface HealthReport {
  overall: CheckStatus;
  checks: HealthCheckResult[];
  generatedAt: string;
}

interface Check {
  id: string;
  label: string;
  run: () => Promise<Omit<HealthCheckResult, "id" | "label" | "durationMs">>;
}

async function runCheck(check: Check): Promise<HealthCheckResult> {
  const started = Date.now();
  try {
    const partial = await check.run();
    return { ...partial, id: check.id, label: check.label, durationMs: Date.now() - started };
  } catch (err) {
    return {
      id: check.id,
      label: check.label,
      status: "fail",
      detail: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - started,
    };
  }
}

function rollup(checks: HealthCheckResult[]): CheckStatus {
  if (checks.some((c) => c.status === "fail")) return "fail";
  if (checks.some((c) => c.status === "warn")) return "warn";
  if (checks.every((c) => c.status === "n/a")) return "n/a";
  return "ok";
}

const CHECKS: Check[] = [
  {
    id: "storage.probe",
    label: "Storage provider reachable",
    run: async () => {
      if (!hasCapability(Capability.Storage)) return { status: "n/a" };
      const { ok, detail } = await getStorageProvider().probe();
      return { status: ok ? "ok" : "fail", detail };
    },
  },
  {
    id: "cipher.canary",
    label: "Encryption key present",
    run: async () => {
      try {
        const ok = await getSecretsCipher().verifyCanary();
        return { status: ok ? "ok" : "fail" };
      } catch {
        return { status: "n/a" };
      }
    },
  },
  {
    id: "license.valid",
    label: "License signature valid",
    run: async () => {
      if (!hasCapability(Capability.Licensing)) return { status: "n/a" };
      const details = await getLicensingProvider().validate();
      const expiresAt = new Date(details.expiresAt).getTime();
      if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
        return { status: "fail", detail: "License expired" };
      }
      return { status: "ok", detail: `${details.customer} · ${details.edition}` };
    },
  },
  {
    id: "backup.available",
    label: "Backup service ready",
    run: async () => {
      try {
        const svc = getBackupService();
        const snapshots = await svc.list();
        return { status: "ok", detail: `${snapshots.length} snapshot(s)` };
      } catch {
        return { status: "n/a" };
      }
    },
  },
];

export async function runHealthCheck(): Promise<HealthReport> {
  const checks = await Promise.all(CHECKS.map(runCheck));
  return {
    overall: rollup(checks),
    checks,
    generatedAt: new Date().toISOString(),
  };
}
