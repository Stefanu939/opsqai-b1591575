// Microsoft Entra ID (Azure AD) for Self-Hosted installations — server only.
//
// One app registration made by the customer serves two purposes:
//  - delegated OIDC sign-in for the platform (never the public website,
//    never the Management Center)
//  - app-only Microsoft Graph access for SharePoint folder sync
// Configuration lives in the local config.json under `microsoft`.

import { createHash, createPublicKey, randomBytes, verify as cryptoVerify } from "node:crypto";
import { readSelfHostConfig, writeSelfHostConfig } from "@/lib/selfhost-config.server";

export interface MicrosoftConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  ssoEnabled?: boolean;
}

export function getMicrosoftConfig(): MicrosoftConfig {
  const cfg = readSelfHostConfig();
  return (cfg.microsoft as MicrosoftConfig | undefined) ?? {};
}

export function setMicrosoftConfig(patch: MicrosoftConfig): MicrosoftConfig {
  const cfg = readSelfHostConfig();
  const current = (cfg.microsoft as MicrosoftConfig | undefined) ?? {};
  const next: MicrosoftConfig = { ...current, ...patch };
  // An empty secret in the form means "keep the stored one".
  if (!patch.clientSecret) next.clientSecret = current.clientSecret;
  cfg.microsoft = next;
  writeSelfHostConfig(cfg);
  return next;
}

export function isMicrosoftConfigured(c: MicrosoftConfig = getMicrosoftConfig()): boolean {
  return Boolean(c.tenantId && c.clientId && c.clientSecret);
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validTenant(t: string): boolean {
  return GUID.test(t) || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(t);
}

const b64url = (b: Buffer) => b.toString("base64url");
export const randomToken = () => b64url(randomBytes(32));
export const sha256b64url = (s: string) => b64url(createHash("sha256").update(s).digest());
export const sha256hex = (s: string) => createHash("sha256").update(s).digest("hex");

function authority(c: MicrosoftConfig) {
  return `https://login.microsoftonline.com/${encodeURIComponent(c.tenantId!)}`;
}

export function buildAuthorizeUrl(
  c: MicrosoftConfig,
  p: { redirectUri: string; state: string; nonce: string; codeVerifier: string; loginHint?: string },
): string {
  const u = new URL(`${authority(c)}/oauth2/v2.0/authorize`);
  u.searchParams.set("client_id", c.clientId!);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", p.redirectUri);
  u.searchParams.set("response_mode", "query");
  u.searchParams.set("scope", "openid profile email");
  u.searchParams.set("state", p.state);
  u.searchParams.set("nonce", p.nonce);
  u.searchParams.set("code_challenge", sha256b64url(p.codeVerifier));
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("prompt", "select_account");
  if (p.loginHint) u.searchParams.set("login_hint", p.loginHint);
  return u.toString();
}

export async function exchangeCode(
  c: MicrosoftConfig,
  p: { code: string; redirectUri: string; codeVerifier: string },
): Promise<{ id_token: string }> {
  const body = new URLSearchParams({
    client_id: c.clientId!,
    client_secret: c.clientSecret!,
    grant_type: "authorization_code",
    code: p.code,
    redirect_uri: p.redirectUri,
    code_verifier: p.codeVerifier,
    scope: "openid profile email",
  });
  const res = await fetch(`${authority(c)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as { id_token?: string; error_description?: string; error?: string };
  if (!res.ok || !json.id_token) {
    throw new Error(`entra_token_failed: ${json.error ?? res.status} ${json.error_description?.split("\r\n")[0] ?? ""}`.trim());
  }
  return { id_token: json.id_token };
}

interface Jwk { kid: string; kty: string; n: string; e: string }
let jwksCache: { tenant: string; at: number; keys: Jwk[] } | null = null;

async function getJwks(c: MicrosoftConfig, force = false): Promise<Jwk[]> {
  if (!force && jwksCache && jwksCache.tenant === c.tenantId && Date.now() - jwksCache.at < 6 * 3600_000) {
    return jwksCache.keys;
  }
  const res = await fetch(`${authority(c)}/discovery/v2.0/keys`);
  if (!res.ok) throw new Error("entra_jwks_unavailable");
  const { keys } = (await res.json()) as { keys: Jwk[] };
  jwksCache = { tenant: c.tenantId!, at: Date.now(), keys };
  return keys;
}

export interface EntraIdentity {
  tenantId: string;
  objectId: string;
  email: string;
  name: string | null;
}

/** Verify an Entra ID token (RS256 signature, issuer, audience, expiry, nonce). */
export async function verifyIdToken(c: MicrosoftConfig, token: string, nonce: string): Promise<EntraIdentity> {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) throw new Error("entra_bad_token");
  const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8")) as { kid?: string; alg?: string };
  if (header.alg !== "RS256" || !header.kid) throw new Error("entra_bad_alg");
  let keys = await getJwks(c);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await getJwks(c, true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) throw new Error("entra_unknown_key");
  const key = createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: "jwk" });
  const ok = cryptoVerify("RSA-SHA256", Buffer.from(`${h}.${p}`), key, Buffer.from(s, "base64url"));
  if (!ok) throw new Error("entra_bad_signature");

  const claims = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);
  if (claims.aud !== c.clientId) throw new Error("entra_bad_audience");
  if (typeof claims.exp !== "number" || claims.exp < now - 60) throw new Error("entra_token_expired");
  if (claims.nonce !== nonce) throw new Error("entra_bad_nonce");
  const tid = String(claims.tid ?? "");
  if (claims.iss !== `https://login.microsoftonline.com/${tid}/v2.0`) throw new Error("entra_bad_issuer");
  // A GUID tenant in config must match exactly; a domain tenant is resolved by Microsoft itself.
  if (GUID.test(c.tenantId!) && tid.toLowerCase() !== c.tenantId!.toLowerCase()) throw new Error("entra_wrong_tenant");

  const email = String(claims.email ?? claims.preferred_username ?? claims.upn ?? "").trim().toLowerCase();
  if (!email.includes("@")) throw new Error("entra_no_email");
  return {
    tenantId: tid,
    objectId: String(claims.oid ?? claims.sub ?? ""),
    email,
    name: typeof claims.name === "string" ? claims.name : null,
  };
}

// ── App-only Graph token (SharePoint sync) ────────────────────────────────
let graphToken: { tenant: string; token: string; exp: number } | null = null;

export async function getGraphAppToken(c: MicrosoftConfig = getMicrosoftConfig()): Promise<string> {
  if (!isMicrosoftConfigured(c)) throw new Error("Microsoft 365 is not configured.");
  if (graphToken && graphToken.tenant === c.tenantId && graphToken.exp - 120 > Date.now() / 1000) {
    return graphToken.token;
  }
  const res = await fetch(`${authority(c)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId!,
      client_secret: c.clientSecret!,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Microsoft Graph token failed: ${json.error_description?.split("\r\n")[0] ?? res.status}`);
  }
  graphToken = { tenant: c.tenantId!, token: json.access_token, exp: Date.now() / 1000 + (json.expires_in ?? 3600) };
  return json.access_token;
}

export async function graphGet<T>(pathOrUrl: string): Promise<T> {
  const token = await getGraphAppToken();
  const url = pathOrUrl.startsWith("https://") ? pathOrUrl : `https://graph.microsoft.com/v1.0${pathOrUrl}`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Graph ${res.status}: ${t.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export async function graphDownload(pathOrUrl: string): Promise<Uint8Array> {
  const token = await getGraphAppToken();
  const url = pathOrUrl.startsWith("https://") ? pathOrUrl : `https://graph.microsoft.com/v1.0${pathOrUrl}`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Graph download ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Public origin of this installation as seen by the browser (behind Caddy).
 * The Host / X-Forwarded-Host headers are attacker-controlled, so they are
 * only trusted when they match the request URL host or a known installation
 * address (private/LAN hosts or OPSQAI_ALLOWED_HOSTS). Anything else falls
 * back to the URL the server actually received — redirects can never leave
 * this installation.
 */
const PRIVATE_HOST =
  /^(localhost|127\.0\.0\.1|::1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/i;
const LAN_HOST = /^[a-z0-9-]+(\.(local|lan|internal|corp|home\.arpa))?(:\d+)?$/i;

function allowedHost(host: string, urlHost: string): boolean {
  if (!host || host.length > 255 || /[\s/?#@]/.test(host)) return false;
  if (host.toLowerCase() === urlHost.toLowerCase()) return true;
  if (PRIVATE_HOST.test(host) || LAN_HOST.test(host)) return true;
  const extra = (process.env["OPSQAI_ALLOWED_HOSTS"] ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return extra.includes(host.toLowerCase());
}

export function requestOrigin(request: Request): string {
  const u = new URL(request.url);
  const fwdHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const hostHeader = request.headers.get("host")?.trim() ?? "";
  const host = allowedHost(fwdHost, u.host)
    ? fwdHost
    : allowedHost(hostHeader, u.host)
      ? hostHeader
      : u.host;
  const protoHeader = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() ?? "";
  const proto = protoHeader === "https" || protoHeader === "http" ? protoHeader : u.protocol.replace(":", "");
  return `${proto}://${host}`;
}
