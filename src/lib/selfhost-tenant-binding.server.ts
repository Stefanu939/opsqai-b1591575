// Self-Hosted tenant binding (server only).
//
// One installation belongs to exactly ONE customer. The owning company is
// recorded the first time an installation licence is activated
// (`public.installation_identity`). Activating a licence issued to another
// company is refused, and the platform locks itself when the licence on disk
// stops matching the recorded owner (data folder copied to another machine).

import { Pool } from "pg";
import { pgDateTypes } from "@/lib/providers/selfhost/pg-types.server";

let pool: Pool | null = null;

function getPool(): Pool | null {
  if (pool) return pool;
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) return null;
  pool = new Pool({ connectionString, types: pgDateTypes, max: 2, idleTimeoutMillis: 10_000 });
  return pool;
}

/** Stable comparison key for a licensed company (name is operator-visible). */
export function companyKey(input: {
  install_id?: string | null;
  customer?: string | null;
}): string {
  const name = (input.customer ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const install = (input.install_id ?? "").trim().toLowerCase();
  return name ? `name:${name}` : install ? `install:${install}` : "";
}

export interface InstallationOwner {
  installId: string | null;
  companyKey: string;
  companyName: string | null;
  boundAt: string | null;
}

export async function readInstallationOwner(): Promise<InstallationOwner | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const { rows } = await p.query<{
      install_id: string | null;
      company_key: string;
      company_name: string | null;
      bound_at: Date | string | null;
    }>(
      "SELECT install_id, company_key, company_name, bound_at FROM public.installation_identity WHERE id = TRUE",
    );
    const row = rows[0];
    if (!row || !row.company_key) return null;
    return {
      installId: row.install_id,
      companyKey: row.company_key,
      companyName: row.company_name,
      boundAt:
        row.bound_at instanceof Date ? row.bound_at.toISOString() : (row.bound_at ?? null),
    };
  } catch {
    // Table missing (migration not applied yet) — behave as "not bound".
    return null;
  }
}

async function logOwnerEvent(event: string, detail: string) {
  const p = getPool();
  if (!p) return;
  await p
    .query("INSERT INTO public.installation_owner_events (event, detail) VALUES ($1, $2)", [
      event,
      detail,
    ])
    .catch(() => undefined);
}

/** Record (or refresh) the owning company for this installation. */
export async function bindInstallationOwner(input: {
  install_id?: string | null;
  customer?: string | null;
}): Promise<void> {
  const key = companyKey(input);
  if (!key) return;
  const p = getPool();
  if (!p) return;
  try {
    await p.query(
      `INSERT INTO public.installation_identity (id, install_id, company_key, company_name)
       VALUES (TRUE, $1, $2, $3)
       ON CONFLICT (id) DO UPDATE
         SET install_id = COALESCE(EXCLUDED.install_id, public.installation_identity.install_id),
             company_key = CASE
               WHEN public.installation_identity.company_key = '' THEN EXCLUDED.company_key
               ELSE public.installation_identity.company_key
             END,
             company_name = COALESCE(EXCLUDED.company_name, public.installation_identity.company_name),
             updated_at = NOW()`,
      [input.install_id ?? null, key, (input.customer ?? null) || null],
    );
    await logOwnerEvent("bound", `${key}`);
  } catch {
    /* table missing — nothing to bind yet */
  }
}

export type OwnerCheck =
  | { ok: true; bound: boolean }
  | { ok: false; reason: "license_belongs_to_other_company"; owner: InstallationOwner };

/**
 * Compare an installation licence against the recorded owner.
 * Unbound installations (fresh, or upgraded from an older build) accept the
 * licence and adopt it as the owner.
 */
export async function checkLicenseOwner(input: {
  install_id?: string | null;
  customer?: string | null;
}): Promise<OwnerCheck> {
  const owner = await readInstallationOwner();
  if (!owner) return { ok: true, bound: false };
  const key = companyKey(input);
  if (!key || key === owner.companyKey) return { ok: true, bound: true };
  await logOwnerEvent("rejected", `${key} != ${owner.companyKey}`);
  return { ok: false, reason: "license_belongs_to_other_company", owner };
}

export interface InstallationHygiene {
  bound: boolean;
  ownerCompany: string | null;
  installId: string | null;
  boundAt: string | null;
  licenseCompany: string | null;
  mismatch: boolean;
  ownerCount: number;
  owners: Array<{ id: string; email: string; createdAt: string | null }>;
}

/** Installation hygiene report: owning company + platform-owner accounts. */
export async function installationHygiene(): Promise<InstallationHygiene> {
  const owner = await readInstallationOwner();
  const p = getPool();
  let owners: InstallationHygiene["owners"] = [];
  if (p) {
    try {
      const { rows } = await p.query<{ id: string; email: string; created_at: Date | string | null }>(
        `SELECT u.id, u.email, u.created_at
           FROM public.user_roles r
           JOIN public.users u ON u.id = r.user_id
          WHERE r.role = 'platform_owner'
          ORDER BY u.created_at`,
      );
      owners = rows.map((r) => ({
        id: r.id,
        email: r.email,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : (r.created_at ?? null),
      }));
    } catch {
      owners = [];
    }
  }

  let licenseCompany: string | null = null;
  let mismatch = false;
  try {
    const { activeInstallLicense } = await import("@/lib/selfhost-license-activation.server");
    const active = await activeInstallLicense();
    licenseCompany = active?.customer ?? null;
    if (owner && active) {
      mismatch = companyKey(active) !== owner.companyKey;
    }
  } catch {
    /* no licence on disk */
  }

  return {
    bound: Boolean(owner),
    ownerCompany: owner?.companyName ?? null,
    installId: owner?.installId ?? null,
    boundAt: owner?.boundAt ?? null,
    licenseCompany,
    mismatch,
    ownerCount: owners.length,
    owners,
  };
}
