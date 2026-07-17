// Offline ILicensingProvider for OPSQAI Self-Hosted.
//
// The license is a single Ed25519-signed JWT-shaped token issued by MC
// and dropped on the Windows host at install time (or via the "Enter
// license key" installer step). Validation is 100% offline; the public
// key is embedded in the application binary. Heartbeats are best-effort
// and DO NOT block the app when offline — a licensed customer running
// in an air-gapped environment must still be able to use the product.

import { readFile } from "node:fs/promises";
import type { KeyObject } from "node:crypto";
import type { Pool } from "pg";

import type {
  HeartbeatInput,
  ILicensingProvider,
  LicenseChannel,
  LicenseDetails,
} from "@/lib/providers/interfaces";
import { Capability } from "@/lib/platform";

import { verifyJwtEd25519, type JwtClaims } from "./jwt-ed25519.server";

const LICENSE_ISSUER = "opsqai-mc";
const LICENSE_AUDIENCE = "opsqai-selfhost";

export interface LocalLicensingDeps {
  pool: Pool;
  /** Ed25519 public key that verifies license tokens (baked into the app). */
  licensePublicKey: KeyObject;
  /** Absolute path to license file, default `%ProgramData%\\OPSQAI\\config\\license.opsqai`. */
  licenseFilePath: string;
  /** Optional heartbeat endpoint. If unset, heartbeat is a no-op. */
  heartbeatUrl?: string;
  /** Injectable clock for tests. */
  now?: () => Date;
}

interface LicenseClaims extends JwtClaims {
  customer: string;
  seats: number;
  edition: string;
  channel: LicenseChannel;
  support: string;
  flags?: Record<string, boolean>;
}

export function createLocalLicensingProvider(deps: LocalLicensingDeps): ILicensingProvider {
  const { pool, licensePublicKey, licenseFilePath } = deps;
  const now = deps.now ?? (() => new Date());

  async function readAndVerify(): Promise<{ claims: LicenseClaims; raw: string }> {
    const raw = (await readFile(licenseFilePath, "utf8")).trim();
    const { claims } = verifyJwtEd25519(raw, licensePublicKey, {
      issuer: LICENSE_ISSUER,
      audience: LICENSE_AUDIENCE,
      clockToleranceSec: 60 * 60 * 24, // 1-day skew — Windows clock drift friendly
    });
    return { claims: claims as LicenseClaims, raw };
  }

  async function persist(claims: LicenseClaims, raw: string): Promise<void> {
    await pool.query(
      `INSERT INTO public.licenses
         (customer, seats, edition, channel, support_level, expires_at, raw_token)
       VALUES ($1, $2, $3, $4, $5, to_timestamp($6), $7)
       ON CONFLICT DO NOTHING`,
      [
        claims.customer,
        claims.seats,
        claims.edition,
        claims.channel,
        claims.support,
        claims.exp,
        raw,
      ],
    );
  }

  return {
    capability: Capability.Licensing,
    name: "opsqai.selfhost.local-licensing",

    async validate(): Promise<LicenseDetails> {
      const { claims, raw } = await readAndVerify();
      await persist(claims, raw);
      return {
        customer: claims.customer,
        seats: claims.seats,
        edition: claims.edition,
        channel: claims.channel,
        supportLevel: claims.support,
        expiresAt: new Date(claims.exp * 1000).toISOString(),
        featureFlags: claims.flags ?? {},
      };
    },

    async heartbeat(input: HeartbeatInput) {
      if (!deps.heartbeatUrl) return { ok: true }; // offline mode
      try {
        const res = await fetch(deps.heartbeatUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            installation_id: input.installationId,
            fingerprint: input.machineFingerprintSha256,
            app_version: input.appVersion,
            at: now().toISOString(),
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) return { ok: false };
        const json = (await res.json().catch(() => ({}))) as { next_at?: string };
        return { ok: true, nextAt: json.next_at };
      } catch {
        // Air-gapped installs must never fail hard here.
        return { ok: false };
      }
    },

    async latestRelease(input: HeartbeatInput) {
      if (!deps.heartbeatUrl) return null;
      try {
        const url = new URL(deps.heartbeatUrl);
        url.pathname = url.pathname.replace(/\/?$/, "") + "/latest";
        url.searchParams.set("app_version", input.appVersion);
        url.searchParams.set("installation_id", input.installationId);
        const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        if (!res.ok) return null;
        const json = (await res.json()) as { version?: string; url?: string };
        if (!json.version || !json.url) return null;
        return { version: json.version, url: json.url };
      } catch {
        return null;
      }
    },
  };
}
