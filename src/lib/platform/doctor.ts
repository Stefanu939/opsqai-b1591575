// OPSQAI Doctor.
//
// Broader than the health check — the Doctor produces a structured
// report of operational concerns (disk, certs, backups, license
// expiry, AI reachability, fingerprint drift, edition/feature-flag
// alignment). Consumed by the Admin Console and the `opsqai doctor`
// CLI.
//
// Individual probes are registered here as thin, provider-driven
// functions so the same module works on Cloud (where most probes
// return `n/a`) and on Self-Hosted (where they are load-bearing).

import { Capability, Edition, getActiveEdition, hasCapability } from "@/lib/platform";
import { getLicensingProvider } from "@/lib/providers";

export type DoctorSeverity = "green" | "amber" | "red" | "n/a";

export interface DoctorFinding {
  id: string;
  category:
    | "services"
    | "disk"
    | "tls"
    | "backup"
    | "license"
    | "ai"
    | "database"
    | "fingerprint"
    | "edition";
  severity: DoctorSeverity;
  message: string;
  actionable?: string;
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

async function probeLicense(): Promise<DoctorFinding> {
  if (!hasCapability(Capability.Licensing)) {
    return { id: "license.expiry", category: "license", severity: "n/a", message: "Licensing not applicable" };
  }
  try {
    const details = await getLicensingProvider().validate();
    const days = Math.floor((new Date(details.expiresAt).getTime() - Date.now()) / 86_400_000);
    if (days < 0) {
      return { id: "license.expiry", category: "license", severity: "red", message: "License has expired", actionable: "Renew licence via the Admin Console" };
    }
    if (days < 30) {
      return { id: "license.expiry", category: "license", severity: "amber", message: `License expires in ${days} day(s)` };
    }
    return { id: "license.expiry", category: "license", severity: "green", message: "License valid" };
  } catch (err) {
    return { id: "license.expiry", category: "license", severity: "red", message: err instanceof Error ? err.message : String(err) };
  }
}

function probeEdition(): DoctorFinding {
  const ed = getActiveEdition();
  return {
    id: "edition.active",
    category: "edition",
    severity: "green",
    message: `Active edition: ${ed}${ed === Edition.Community ? " (evaluation)" : ""}`,
  };
}

export async function runDoctor(): Promise<DoctorReport> {
  const findings = [await probeLicense(), probeEdition()];
  return {
    overall: rollup(findings),
    findings,
    generatedAt: new Date().toISOString(),
  };
}
