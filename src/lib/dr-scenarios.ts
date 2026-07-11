// Phase 5.5 — Disaster Recovery.
//
// The 7 canonical DR scenarios OPSQAI must support. Used by:
//   - Doctor panel (labels + runbook links)
//   - Docs (Architecture Book Ch. Recovery, Administrator Guide Restore)
//   - Phase-7 reference-install acceptance (all 7 must pass end-to-end)
//
// Pure data — no runtime side-effects. Kept in `src/lib/` (not `.server.ts`)
// so both client UI and server code can import the list.

export type DrRecoveryPath = "break_glass" | "bootstrap_token" | "backup_restore";

export interface DrScenario {
  id: string;
  title: string;
  summary: string;
  /** Recovery paths applicable to this scenario, in preferred order. */
  paths: DrRecoveryPath[];
  /** Whether the customer can resolve this without contacting OPSQAI. */
  offline_capable: boolean;
}

export const DR_SCENARIOS: readonly DrScenario[] = [
  {
    id: "db_restore_same_host",
    title: "DB restore on the same host",
    summary:
      "PostgreSQL data is corrupted or lost; the OS + install_id are intact. Restore from the most recent verified backup, doctor green.",
    paths: ["backup_restore"],
    offline_capable: true,
  },
  {
    id: "db_restore_new_host",
    title: "DB restore on a new host (same install_id)",
    summary:
      "Host is replaced but the customer keeps their install_id and license tokens. Reinstall + restore backup + re-run wizard in recovery mode.",
    paths: ["backup_restore", "break_glass"],
    offline_capable: true,
  },
  {
    id: "lost_admin_no_backup",
    title: "Lost platform-admin account, backup available",
    summary:
      "Nobody can log in as platform admin. Enter recovery mode via break-glass secret to re-create an admin, then restore normal auth.",
    paths: ["break_glass", "bootstrap_token"],
    offline_capable: true,
  },
  {
    id: "lost_admin_no_break_glass",
    title: "Lost platform-admin account, no break-glass secret",
    summary:
      "Break-glass secret is also lost. Customer contacts OPSQAI; MC issues a signed Bootstrap Recovery Token bound to install_id.",
    paths: ["bootstrap_token"],
    offline_capable: false,
  },
  {
    id: "license_desync",
    title: "License data desync after restore",
    summary:
      "DB restore succeeded but installed license tokens are older than reality. Re-import the latest activation bundle from Customer Portal.",
    paths: ["backup_restore"],
    offline_capable: true,
  },
  {
    id: "signing_key_rotation",
    title: "Signing key rotation mid-flight",
    summary:
      "MC rotated its signing key while the install was offline. Fetch the updated public key set via activation bundle; existing tokens keep verifying by key_id.",
    paths: ["backup_restore"],
    offline_capable: true,
  },
  {
    id: "full_disaster",
    title: "Full disaster (host + backup lost)",
    summary:
      "Host and backups are lost. Fresh install with the SAME install_id, MC issues Bootstrap Recovery Token, customer re-imports activation bundle. Application data prior to last off-site backup is unrecoverable.",
    paths: ["bootstrap_token"],
    offline_capable: false,
  },
] as const;

export function findDrScenario(id: string): DrScenario | undefined {
  return DR_SCENARIOS.find((s) => s.id === id);
}
