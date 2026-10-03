// Remote access for workstations in other locations (Self-Hosted, server only).
//
// The app only writes the admin's wish into remote.json; the platform service
// (running on the main computer) does the router mapping and reports back.
// Pairing codes carry the public address, a one-time secret and the first
// 16 hex chars of the local certificate authority fingerprint, so a remote
// workstation can verify it is talking to the real main computer.

import { createHash, randomBytes, X509Certificate } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { Pool } from "pg";
import { pgDateTypes } from "@/lib/providers/selfhost/pg-types.server";

const PD = () => process.env["ProgramData"] || "C:\\ProgramData";
const REMOTE_JSON = () => path.join(PD(), "OPSQAI", "config", "remote.json");
const CA_REL = ["pki", "authorities", "local", "root.crt"];
/** Caddy stores its local CA under XDG_DATA_HOME/caddy, or under the service account's AppData. */
const CA_PATHS = () => {
  const win = process.env["SystemRoot"] || "C:\\Windows";
  return [
    path.join(PD(), "OPSQAI", "certs", "caddy", ...CA_REL),
    path.join(PD(), "OPSQAI", "certs", ...CA_REL),
    path.join(win, "System32", "config", "systemprofile", "AppData", "Roaming", "Caddy", ...CA_REL),
    path.join(win, "System32", "config", "systemprofile", "AppData", "Roaming", "caddy", ...CA_REL),
    ...(process.env["APPDATA"] ? [path.join(process.env["APPDATA"], "Caddy", ...CA_REL)] : []),
  ];
};

let pool: Pool | null = null;
function db(): Pool {
  if (pool) return pool;
  const cs = process.env["DATABASE_URL"];
  if (!cs) throw new Error("database_unavailable");
  pool = new Pool({ connectionString: cs, types: pgDateTypes, max: 2, idleTimeoutMillis: 10_000 });
  return pool;
}

export interface RemoteState {
  enabled: boolean;
  externalPort: number;
  hostname: string | null;
  status: "off" | "pending" | "ready" | "router_manual" | "cgnat";
  publicIp: string | null;
  localIp: string | null;
  error: string | null;
  checkedAt: string | null;
}

export async function readRemote(): Promise<RemoteState> {
  let j: Record<string, unknown> = {};
  try {
    j = JSON.parse(await fs.readFile(REMOTE_JSON(), "utf8"));
  } catch {
    /* not configured */
  }
  const enabled = j.enabled === true;
  return {
    enabled,
    externalPort: Number(j.externalPort) || 44300,
    hostname: typeof j.hostname === "string" && j.hostname ? j.hostname : null,
    status: enabled ? ((j.status as RemoteState["status"]) ?? "pending") : "off",
    publicIp: (j.publicIp as string) ?? null,
    localIp: (j.localIp as string) ?? null,
    error: (j.error as string) ?? null,
    checkedAt: (j.checkedAt as string) ?? null,
  };
}

export async function writeRemote(patch: { enabled: boolean; externalPort?: number; hostname?: string | null }) {
  let cur: Record<string, unknown> = {};
  try {
    cur = JSON.parse(await fs.readFile(REMOTE_JSON(), "utf8"));
  } catch {
    /* new */
  }
  const next = {
    ...cur,
    enabled: patch.enabled,
    externalPort: patch.externalPort ?? cur.externalPort ?? 44300,
    hostname: patch.hostname === undefined ? (cur.hostname ?? null) : patch.hostname,
    status: patch.enabled ? "pending" : "off",
    requestedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(REMOTE_JSON()), { recursive: true });
  await fs.writeFile(REMOTE_JSON(), JSON.stringify(next, null, 2));
}

/** Host names / IPs the main computer may present a certificate for remotely. */
export async function remoteHosts(): Promise<string[]> {
  const r = await readRemote();
  if (!r.enabled) return [];
  return [r.publicIp, r.hostname].filter((h): h is string => !!h).map((h) => h.toLowerCase());
}

export async function readCa(): Promise<{ pem: string; fingerprint: string } | null> {
  for (const p of CA_PATHS()) {
    try {
      const pem = await fs.readFile(p, "utf8");
      const fp = new X509Certificate(pem).fingerprint256.replace(/:/g, "").toLowerCase();
      return { pem, fingerprint: fp };
    } catch {
      /* try next location */
    }
  }
  return null;
}

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const hash = (s: string) => createHash("sha256").update(s.toUpperCase()).digest("hex");

export async function createPairingCode(userId: string) {
  const r = await readRemote();
  const host = r.hostname || r.publicIp;
  if (!r.enabled || !host) throw new Error("Accesul de la distanță nu este încă pregătit. Activați-l și așteptați până apare adresa publică.");
  const ca = await readCa();
  if (!ca) throw new Error("Certificatul de securitate al calculatorului principal nu a fost găsit încă. Deschideți o dată https://localhost pe acest calculator (serviciul HTTPS îl creează automat), apoi încercați din nou.");
  const bytes = randomBytes(8);
  const secret = Array.from(bytes, (b) => ALPHA[b % ALPHA.length]).join("");
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  await db().query("DELETE FROM public.station_pairing_codes WHERE expires_at < NOW() - INTERVAL '1 day'");
  await db().query(
    "INSERT INTO public.station_pairing_codes (code_hash, created_by, expires_at) VALUES ($1, $2, $3)",
    [hash(secret), userId, expires],
  );
  const code = `OPSQ-${secret.slice(0, 4)}-${secret.slice(4)}-${ca.fingerprint.slice(0, 16).toUpperCase()}@${host}:${r.externalPort}`;
  return { code, expiresAt: expires.toISOString() };
}

let failures = 0;
/** Consume a one-time secret. After 10 wrong attempts all open codes are voided. */
export async function consumePairingSecret(secret: string, stationId: string): Promise<boolean> {
  const { rowCount } = await db().query(
    `UPDATE public.station_pairing_codes SET used_at = NOW(), used_by_station = $2
      WHERE code_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [hash(secret.replace(/[^A-Za-z0-9]/g, "")), stationId],
  );
  if (rowCount) {
    failures = 0;
    return true;
  }
  if (++failures >= 10) {
    failures = 0;
    await db().query("UPDATE public.station_pairing_codes SET expires_at = NOW() WHERE used_at IS NULL");
  }
  return false;
}

export function isPrivateAddress(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const v = ip.replace(/^::ffff:/, "");
  if (v === "::1" || v === "127.0.0.1") return true;
  const m = /^(\d+)\.(\d+)\./.exec(v);
  if (!m) return /^f[cd]/i.test(v) || /^fe80/i.test(v);
  const a = +m[1], b = +m[2];
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}
