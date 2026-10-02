// Self-Hosted workstations registry (server only).
//
// The main computer owns the licence; workstations are registered here with
// their own id + Ed25519 public key. A workstation proves itself by signing
// "<stationId>.<unix-seconds>" with its private key.

import { Pool } from "pg";
import { createPublicKey, verify } from "crypto";
import { pgDateTypes } from "@/lib/providers/selfhost/pg-types.server";

let pool: Pool | null = null;
function db(): Pool {
  if (pool) return pool;
  const cs = process.env["DATABASE_URL"];
  if (!cs) throw new Error("database_unavailable");
  pool = new Pool({ connectionString: cs, types: pgDateTypes, max: 2, idleTimeoutMillis: 10_000 });
  return pool;
}

export interface StationRow {
  id: string;
  name: string;
  location: string | null;
  hostname: string | null;
  paired_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
}

export async function listStations(): Promise<StationRow[]> {
  const { rows } = await db().query<StationRow>(
    `SELECT id, name, location, hostname, paired_at, last_seen_at, revoked_at
       FROM public.installation_stations ORDER BY paired_at`,
  );
  return rows;
}

export async function countActiveStations(): Promise<number> {
  const { rows } = await db().query<{ n: string }>(
    "SELECT COUNT(*)::text AS n FROM public.installation_stations WHERE revoked_at IS NULL",
  );
  return Number(rows[0]?.n ?? 0);
}

export async function registerStation(input: {
  id: string;
  name: string;
  location: string | null;
  publicKey: string;
  hostname: string | null;
}): Promise<void> {
  await db().query(
    `INSERT INTO public.installation_stations (id, name, location, public_key, hostname, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name, location = EXCLUDED.location, hostname = EXCLUDED.hostname,
           last_seen_at = NOW()
     WHERE public.installation_stations.public_key = EXCLUDED.public_key
       AND public.installation_stations.revoked_at IS NULL`,
    [input.id, input.name, input.location, input.publicKey, input.hostname],
  );
}

export type StationAuth = "ok" | "unknown" | "revoked" | "bad_signature" | "stale";

/** Verify a signed heartbeat and update last_seen_at. */
export async function verifyStation(
  id: string,
  ts: number,
  signatureB64: string,
): Promise<StationAuth> {
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return "stale";
  const { rows } = await db().query<{ public_key: string; revoked_at: string | null }>(
    "SELECT public_key, revoked_at FROM public.installation_stations WHERE id = $1",
    [id],
  );
  const row = rows[0];
  if (!row) return "unknown";
  if (row.revoked_at) return "revoked";
  let ok = false;
  try {
    ok = verify(
      null,
      Buffer.from(`${id}.${ts}`),
      createPublicKey(row.public_key),
      Buffer.from(signatureB64, "base64"),
    );
  } catch {
    ok = false;
  }
  if (!ok) return "bad_signature";
  await db().query("UPDATE public.installation_stations SET last_seen_at = NOW() WHERE id = $1", [id]);
  return "ok";
}

export async function updateStation(id: string, patch: { name?: string; location?: string | null }) {
  await db().query(
    `UPDATE public.installation_stations
        SET name = COALESCE($2, name), location = CASE WHEN $3::boolean THEN $4 ELSE location END
      WHERE id = $1`,
    [id, patch.name ?? null, patch.location !== undefined, patch.location ?? null],
  );
}

export async function revokeStation(id: string, by: string) {
  await db().query(
    "UPDATE public.installation_stations SET revoked_at = NOW(), revoked_by = $2 WHERE id = $1 AND revoked_at IS NULL",
    [id, by],
  );
}
