// Offline ILicensingProvider for OPSQAI Self-Hosted.
//
// The license is a single Ed25519-signed JWT-shaped token issued by MC
// and dropped on the Windows host at install time (or via the "Enter
// license key" installer step). Validation is 100% offline; the public
// key is embedded in the application binary. Heartbeats are best-effort
// and DO NOT block the app when offline — a licensed customer running
// in an air-gapped environment must still be able to use the product.

import { readFile } from "node:fs/promises";
import { verify as cryptoVerify, type KeyObject } from "node:crypto";
import type { Pool } from "pg";

import type {
  HeartbeatInput,
  ILicensingProvider,
  LicenseChannel,
  LicenseDetails,
} from "@/lib/providers/interfaces";
import { Capability } from "@/lib/platform";

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

interface BaseLicenseClaims {
  license_version?: number;
  kind?: "install" | "module";
  install_id?: string;
  key_id?: string;
  issued_at?: number;
  exp?: number;
  expires_at?: number | null;
  maintenance_expires_at?: number | null;
  tier?: string;
  edition?: string;
}

interface InstallLicenseClaims extends BaseLicenseClaims {
  kind?: "install";
  customer: string;
  seats: number;
  company_name?: string;
  max_users?: number;
  channel?: LicenseChannel;
  support?: string;
  support_level?: string;
  flags?: Record<string, boolean>;
}

interface ModuleLicenseClaims extends BaseLicenseClaims {
  kind: "module";
  module: string;
}

interface ActivationBundleJwt {
  bundle_version: 1;
  install_id: string;
  public_key_pem?: string;
  key_id?: string;
  install_token: string;
  module_tokens?: Array<{ module_key: string; signed_token: string }>;
  crl_token?: string;
  issued_at?: number;
}

interface CrlEntry {
  install_id: string;
  kind: "install" | "module";
  module_key: string | null;
  revoked: boolean;
  suspended: boolean;
}

interface CrlPayload {
  crl_version: number;
  key_id?: string;
  issued_at?: number;
  entries?: CrlEntry[];
}

interface VerifiedLicenseSet {
  install: InstallLicenseClaims;
  installRaw: string;
  modules: Array<{ claims: ModuleLicenseClaims; raw: string }>;
  /** Verified revocation entries carried by the activation bundle, if any. */
  crl: CrlEntry[];
}

/** Why a license is not usable. Kept distinct so the UI can explain itself. */
export type LicenseFailureKind = "missing" | "expired" | "invalid" | "revoked";

export class LicenseFailure extends Error {
  constructor(
    readonly kind: LicenseFailureKind,
    message: string,
  ) {
    super(message);
    this.name = "LicenseFailure";
  }
}

const NO_EXPIRY_ISO = "9999-12-31T23:59:59.000Z";

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 ? "=".repeat(4 - (input.length % 4)) : "";
  return Buffer.from((input + pad).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Verify an `opsqai-crl.v1.<payload>.<sig>` token with the SAME pinned public
 * key that verifies license tokens. An unverifiable CRL is ignored (an
 * attacker must not be able to lift entitlements by corrupting it), but a
 * verified CRL is authoritative: revoked/suspended entries win over the
 * signed install/module tokens.
 */
function verifyCrlToken(token: string, publicKey: KeyObject): CrlEntry[] {
  const parts = token.trim().split(".");
  if (parts.length !== 4 || parts[0] !== "opsqai-crl" || parts[1] !== "v1") return [];
  try {
    const ok = cryptoVerify(null, Buffer.from(parts[2]), publicKey, b64urlDecode(parts[3]));
    if (!ok) return [];
    const payload = JSON.parse(b64urlDecode(parts[2]).toString("utf8")) as CrlPayload;
    if (payload.crl_version !== 1 || !Array.isArray(payload.entries)) return [];
    return payload.entries.filter((e) => e && typeof e.install_id === "string");
  } catch {
    return [];
  }
}

function crlBlocksInstall(crl: CrlEntry[], installId: string | null | undefined): boolean {
  if (!installId) return false;
  return crl.some(
    (e) => e.install_id === installId && e.kind === "install" && (e.revoked || e.suspended),
  );
}

function crlBlocksModule(
  crl: CrlEntry[],
  installId: string | null | undefined,
  moduleKey: string,
): boolean {
  return crl.some(
    (e) =>
      e.kind === "module" &&
      e.module_key === moduleKey &&
      (!installId || e.install_id === installId) &&
      (e.revoked || e.suspended),
  );
}


export function verifyCompactToken(token: string, publicKey: KeyObject): unknown {
  const parts = token.trim().split(".");
  if (parts.length === 3) {
    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(b64urlDecode(headerB64).toString("utf8")) as { alg?: string; typ?: string };
    if (header.alg !== "EdDSA") throw new Error(`Refusing license token alg=${header.alg}; expected EdDSA`);
    const ok = cryptoVerify(
      null,
      Buffer.from(`${headerB64}.${payloadB64}`, "utf8"),
      publicKey,
      b64urlDecode(signatureB64),
    );
    if (!ok) throw new Error("License signature verification failed");
    return JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  }

  // Legacy compatibility only. New OPSQAI artifacts are JWT/JWS compact tokens.
  if (parts.length === 4 && parts[0] === "opsqai" && parts[1] === "v1") {
    const [, , payloadB64, signatureB64] = parts;
    const ok = cryptoVerify(null, Buffer.from(payloadB64), publicKey, b64urlDecode(signatureB64));
    if (!ok) throw new Error("License signature verification failed");
    return JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  }

  throw new Error("Malformed OPSQAI license: expected JWT compact format");
}

/**
 * Extra module licenses activated *after* install live next to the main
 * license file. Each entry is an individually signed module JWT, so trust
 * still rests entirely on the pinned public key — no local signing.
 */
export function moduleSidecarPath(licenseFilePath: string): string {
  return `${licenseFilePath}.modules.json`;
}

export async function readModuleSidecar(
  licenseFilePath: string,
): Promise<Array<{ module_key: string; signed_token: string }>> {
  try {
    const raw = await readFile(moduleSidecarPath(licenseFilePath), "utf8");
    const parsed = JSON.parse(raw) as Array<{ module_key?: string; signed_token?: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => typeof e?.signed_token === "string")
      .map((e) => ({ module_key: String(e.module_key ?? ""), signed_token: String(e.signed_token) }));
  } catch {
    return [];
  }
}

export function isActivationBundlePayload(payload: unknown): boolean {
  return isActivationBundle(payload);
}

function isActivationBundle(payload: unknown): payload is ActivationBundleJwt {
  const p = payload as Partial<ActivationBundleJwt>;
  return p?.bundle_version === 1 && typeof p.install_token === "string";
}

function expirySeconds(claims: BaseLicenseClaims): number | null {
  if (typeof claims.exp === "number") return claims.exp;
  if (typeof claims.expires_at === "number") return claims.expires_at;
  return null;
}

function expiryIso(claims: BaseLicenseClaims): string {
  const exp = expirySeconds(claims);
  return exp ? new Date(exp * 1000).toISOString() : NO_EXPIRY_ISO;
}

function assertNotExpired(claims: BaseLicenseClaims, now: Date): void {
  const exp = expirySeconds(claims);
  if (exp && exp * 1000 < now.getTime()) {
    throw new LicenseFailure("expired", "License expired");
  }
}

function normalizeInstallClaims(claims: InstallLicenseClaims): InstallLicenseClaims {
  return {
    ...claims,
    kind: "install",
    customer: claims.customer ?? claims.company_name ?? "OPSQAI Customer",
    seats: claims.seats ?? claims.max_users ?? 1,
    edition: claims.edition ?? claims.tier ?? "professional",
    channel: claims.channel ?? "stable",
    support: claims.support ?? claims.support_level ?? "standard",
  };
}

export function createLocalLicensingProvider(deps: LocalLicensingDeps): ILicensingProvider {
  const { pool, licensePublicKey, licenseFilePath } = deps;
  const now = deps.now ?? (() => new Date());

  async function readAndVerify(): Promise<VerifiedLicenseSet> {
    let raw: string;
    try {
      raw = (await readFile(licenseFilePath, "utf8")).trim();
    } catch {
      throw new LicenseFailure("missing", "No license file present on this installation");
    }

    let outer: unknown;
    try {
      outer = verifyCompactToken(raw, licensePublicKey);
    } catch (e) {
      throw new LicenseFailure("invalid", (e as Error).message);
    }

    if (isActivationBundle(outer)) {
      let install: InstallLicenseClaims;
      try {
        install = normalizeInstallClaims(
          verifyCompactToken(outer.install_token, licensePublicKey) as InstallLicenseClaims,
        );
        if (install.kind !== "install") {
          throw new Error("Activation bundle install token has wrong kind");
        }
      } catch (e) {
        if (e instanceof LicenseFailure) throw e;
        throw new LicenseFailure("invalid", (e as Error).message);
      }
      assertNotExpired(install, now());

      // The bundle's CRL is verified with the same pinned key. Revocation is
      // authoritative and applies before anything is mirrored or granted.
      const crl = outer.crl_token ? verifyCrlToken(outer.crl_token, licensePublicKey) : [];
      if (crlBlocksInstall(crl, install.install_id)) {
        throw new LicenseFailure("revoked", "Installation license revoked or suspended by the vendor");
      }

      const modules: VerifiedLicenseSet["modules"] = [];
      for (const m of outer.module_tokens ?? []) {
        let claims: ModuleLicenseClaims;
        try {
          claims = verifyCompactToken(m.signed_token, licensePublicKey) as ModuleLicenseClaims;
          if (claims.kind !== "module") throw new Error(`Module token ${m.module_key} has wrong kind`);
          if (m.module_key && claims.module !== m.module_key) {
            throw new Error(`Module token mismatch: ${m.module_key} != ${claims.module}`);
          }
          if (install.install_id && claims.install_id && claims.install_id !== install.install_id) {
            throw new Error(`Module token install_id mismatch for ${claims.module}`);
          }
        } catch (e) {
          throw new LicenseFailure("invalid", (e as Error).message);
        }
        // A revoked or expired module is dropped silently — the install stays
        // valid, the module simply is not entitled.
        if (crlBlocksModule(crl, claims.install_id ?? install.install_id, claims.module)) continue;
        const exp = expirySeconds(claims);
        if (exp && exp * 1000 < now().getTime()) continue;
        modules.push({ claims, raw: m.signed_token });
      }

      return {
        install,
        installRaw: outer.install_token,
        modules: await mergeSidecarModules(modules, install.install_id ?? null, crl),
        crl,
      };
    }

    let install: InstallLicenseClaims;
    try {
      install = normalizeInstallClaims(outer as InstallLicenseClaims);
      if (install.kind !== "install") throw new Error("License token has wrong kind");
    } catch (e) {
      throw new LicenseFailure("invalid", (e as Error).message);
    }
    assertNotExpired(install, now());
    return { install, installRaw: raw, modules: [], crl: [] };
  }


  async function upsertMirrorRow(input: {
    installId: string | null;
    kind: "install" | "module";
    moduleKey: string | null;
    customer: string;
    seats: number;
    edition: string;
    channel: LicenseChannel;
    support: string;
    expiresAt: string;
    maintenanceExpiresAt: string | null;
    raw: string;
  }): Promise<void> {
    const existing = input.installId
      ? await pool.query<{ id: string }>(
          `SELECT id FROM public.licenses
           WHERE install_id = $1 AND kind = $2 AND COALESCE(module_key, '') = COALESCE($3, '')
           LIMIT 1`,
          [input.installId, input.kind, input.moduleKey],
        )
      : { rows: [] };

    const values = [
      input.installId,
      input.kind,
      input.moduleKey,
      input.customer,
      input.seats,
      input.edition,
      input.channel,
      input.support,
      input.expiresAt,
      input.maintenanceExpiresAt,
      input.raw,
    ];

    if (existing.rows[0]?.id) {
      await pool.query(
        `UPDATE public.licenses
         SET install_id = $1,
             kind = $2,
             module_key = $3,
             customer = $4,
             company_name = $4,
             seats = $5,
             max_users = $5,
             edition = $6,
             tier = $6,
             channel = $7,
             support_level = $8,
             expires_at = $9,
             maintenance_expires_at = $10,
             raw_token = $11,
             signed_token = $11,
             license_version = 1,
             revoked = false,
             suspended = false,
             validated_at = now()
         WHERE id = $12`,
        [...values, existing.rows[0].id],
      );
      return;
    }

    await pool.query(
      `INSERT INTO public.licenses
         (install_id, kind, module_key, customer, company_name, seats, max_users, edition, tier,
          channel, support_level, expires_at, maintenance_expires_at, raw_token, signed_token,
          license_version, revoked, suspended)
       VALUES ($1, $2, $3, $4, $4, $5, $5, $6, $6, $7, $8, $9, $10, $11, $11, 1, false, false)`,
      values,
    );
  }

  async function persist(set: VerifiedLicenseSet): Promise<void> {
    const install = normalizeInstallClaims(set.install);
    const installId = install.install_id ?? null;
    await upsertMirrorRow({
      installId,
      kind: "install",
      moduleKey: null,
      customer: install.customer,
      seats: install.seats,
      edition: install.edition as string,
      channel: install.channel as LicenseChannel,
      support: install.support as string,
      expiresAt: expiryIso(install),
      maintenanceExpiresAt: install.maintenance_expires_at
        ? new Date(install.maintenance_expires_at * 1000).toISOString()
        : null,
      raw: set.installRaw,
    });

    for (const mod of set.modules) {
      await upsertMirrorRow({
        installId: mod.claims.install_id ?? installId,
        kind: "module",
        moduleKey: mod.claims.module,
        customer: install.customer,
        seats: 0,
        edition: install.edition as string,
        channel: install.channel as LicenseChannel,
        support: install.support as string,
        expiresAt: expiryIso(mod.claims),
        maintenanceExpiresAt: mod.claims.maintenance_expires_at
          ? new Date(mod.claims.maintenance_expires_at * 1000).toISOString()
          : null,
        raw: mod.raw,
      });
    }
  }

  return {
    capability: Capability.Licensing,
    name: "opsqai.selfhost.local-licensing",

    async validate(): Promise<LicenseDetails> {
      const verified = await readAndVerify();
      await persist(verified);
      const claims = normalizeInstallClaims(verified.install);
      return {
        customer: claims.customer,
        seats: claims.seats,
        edition: claims.edition as string,
        channel: claims.channel as LicenseChannel,
        supportLevel: claims.support as string,
        expiresAt: expiryIso(claims),
        featureFlags: claims.flags ?? {},
      };
    },

    async entitlements() {
      try {
        const verified = await readAndVerify();
        const claims = normalizeInstallClaims(verified.install);
        return {
          unlimited: false,
          installId: claims.install_id ?? null,
          customer: claims.customer,
          edition: claims.edition as string,
          seats: claims.seats ?? null,
          modules: verified.modules.map((m) => m.claims.module).filter(Boolean) as string[],
          expiresAt: expirySeconds(claims),
          maintenanceExpiresAt:
            typeof claims.maintenance_expires_at === "number" ? claims.maintenance_expires_at : null,
          revoked: false,
          status: "licensed" as const,
          statusDetail: null,
        };
      } catch (e) {
        // Distinguish "never activated" from "activation no longer valid" so
        // the UI can tell the operator what to actually do about it.
        const failure = e instanceof LicenseFailure ? e : null;
        const kind = failure?.kind ?? "invalid";
        return {
          unlimited: false,
          installId: null,
          customer: null,
          edition: "community",
          seats: null,
          modules: [] as string[],
          expiresAt: null,
          maintenanceExpiresAt: null,
          revoked: kind === "revoked",
          status: kind,
          statusDetail: failure?.message ?? (e as Error)?.message ?? null,
        };
      }
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


// ─── Standalone helper for the Phase 4 heartbeat sender ─────────────────
//
// The heartbeat sender needs the raw install-license JWT (to prove
// ownership to the Management Center) without going through the full
// `ILicensingProvider` surface. This mirrors `readAndVerify()` above but is
// intentionally side-effect-free (no DB mirroring) and never throws.
export async function readInstallLicenseForHeartbeat(
  licenseFilePath: string,
  licensePublicKey: KeyObject,
): Promise<{ installRaw: string; claims: InstallLicenseClaims } | null> {
  try {
    const raw = (await readFile(licenseFilePath, "utf8")).trim();
    const outer = verifyCompactToken(raw, licensePublicKey);

    if (isActivationBundle(outer)) {
      const install = normalizeInstallClaims(
        verifyCompactToken(outer.install_token, licensePublicKey) as InstallLicenseClaims,
      );
      if (install.kind !== "install") return null;
      assertNotExpired(install, new Date());
      return { installRaw: outer.install_token, claims: install };
    }

    const install = normalizeInstallClaims(outer as InstallLicenseClaims);
    if (install.kind !== "install") return null;
    assertNotExpired(install, new Date());
    return { installRaw: raw, claims: install };
  } catch {
    return null;
  }
}
