// Frozen catalog of Setup Wizard step IDs (Phase 5).
//
// The `platform_config.setup_progress` column stores ONLY these string IDs —
// never secrets, never free-form input. New wizard steps are added here first;
// the wizard route and the doctor panel both consume this list.

export type SetupStepId =
  | "eula_accepted"
  | "db_ok"
  | "signing_keys"
  | "ai_configured"
  | "storage_ok"
  | "smtp_configured"
  | "sso_configured"
  | "backup_configured"
  | "license_imported"
  | "admin_created";


export interface SetupStep {
  id: SetupStepId;
  label: string;
  description: string;
  /** Some steps only apply to Self-Hosted; MC/Cloud skips them. */
  selfHostedOnly?: boolean;
  /** Soft = informational, doesn't block "complete". */
  soft?: boolean;
}

export const SETUP_STEPS: readonly SetupStep[] = [
  {
    id: "eula_accepted",
    label: "EULA accepted",
    description: "The customer accepted the OPSQAI End-User License Agreement during first-run setup.",
  },

  {
    id: "db_ok",
    label: "Database reachable",
    description: "PostgreSQL responds to a health query and required extensions are present.",
  },
  {
    id: "signing_keys",
    label: "License signing keys",
    description:
      "The active Ed25519 signing key is present (Management Center) or the pinned public PEM is bundled (Self-Hosted).",
  },
  {
    id: "ai_configured",
    label: "AI provider configured",
    description:
      "At least one AI adapter is registered. Default is Lovable Gateway; Self-Hosted may pick Azure OpenAI or a compatible endpoint.",
  },
  {
    id: "storage_ok",
    label: "Object storage",
    description: "Uploads bucket is writable (attachments, exports, backups).",
    soft: true,
  },
  {
    id: "smtp_configured",
    label: "Outbound email",
    description: "SMTP relay reachable; system emails will actually deliver.",
    soft: true,
  },
  {
    id: "license_imported",
    label: "Installation License imported",
    description: "A signed Installation License token has been imported and matches this install_id.",
    selfHostedOnly: true,
  },
  {
    id: "admin_created",
    label: "First platform admin",
    description: "At least one user holds the platform_admin role on this install.",
  },
] as const;

export function isRequiredStep(step: SetupStep, mode: "cloud" | "selfhost"): boolean {
  if (step.soft) return false;
  if (step.selfHostedOnly && mode !== "selfhost") return false;
  return true;
}

export function computeSetupComplete(
  done: readonly string[],
  mode: "cloud" | "selfhost",
): boolean {
  const doneSet = new Set(done);
  return SETUP_STEPS.filter((s) => isRequiredStep(s, mode)).every((s) => doneSet.has(s.id));
}
