// Pure, testable helpers for license issuing.
//
// Kept free of any server-only import so both the server functions and the
// unit tests can use them.

export interface InstallLicenseRowInput {
  install_id: string;
  company_name: string;
  contact_email: string | null;
  tier: string;
  seats: number;
  expires_at: string | null;
  maintenance_expires_at: string | null;
  notes: string | null;
  signed_token: string;
  issued_by: string | null;
}

/**
 * Row payload for an Installation License. Used for BOTH the first insert and
 * a re-issue update, so a re-issue can never drift from a fresh issue.
 */
export function buildInstallLicenseRow(input: InstallLicenseRowInput) {
  return {
    install_id: input.install_id,
    kind: "install" as const,
    module_key: null,
    company_name: input.company_name,
    contact_email: input.contact_email,
    tier: input.tier,
    modules: [] as string[],
    seats: input.seats,
    max_users: input.seats,
    expires_at: input.expires_at,
    maintenance_expires_at: input.maintenance_expires_at ?? input.expires_at,
    signed_token: input.signed_token,
    notes: input.notes,
    issued_by: input.issued_by,
    license_version: 1,
    revoked: false,
    revoked_at: null,
    revoked_reason: null,
    suspended: false,
    suspended_at: null,
    suspended_reason: null,
  };
}

/**
 * Turns raw Postgres/PostgREST errors into operator-readable messages so the
 * MC never surfaces `duplicate key value violates unique constraint ...`.
 */
export function mapLicenseDbError(message: string, installId: string): string {
  const m = message.toLowerCase();
  if (m.includes("duplicate key") && m.includes("install_id")) {
    return `Install ID "${installId}" already has an Installation License. Re-issue it from the existing row, or pick a different Install ID.`;
  }
  if (m.includes("duplicate key")) {
    return `This license already exists for install "${installId}".`;
  }
  return message;
}
