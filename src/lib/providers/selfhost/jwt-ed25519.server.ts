// Ed25519 (EdDSA) JWT signing/verification for OPSQAI Self-Hosted.
//
// Locally-signed JWTs use EdDSA — NEVER HS256. The private key lives in
// %ProgramData%\OPSQAI\config\keys\jwt-signing.key (PKCS8 PEM, Windows
// ACLs restrict access to LocalSystem + Administrators). The matching
// public key is embedded in the application for verification.
//
// This module is server-only and Node-only (uses `node:crypto`).

import {
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
  randomUUID,
  type KeyObject,
} from "node:crypto";

export interface Ed25519KeyPairPem {
  privatePem: string;
  publicPem: string;
}

export interface JwtHeader {
  alg: "EdDSA";
  typ: "JWT";
  kid?: string;
}

export type JwtClaims = Record<string, unknown> & {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp: number; // required — enforced
  iat?: number;
  nbf?: number;
  jti?: string;
};

function b64urlEncode(input: Uint8Array | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(input: string): Buffer {
  const pad = 4 - (input.length % 4);
  const padded = pad < 4 ? input + "=".repeat(pad) : input;
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Sign a set of claims with an Ed25519 private key. */
export function signJwtEd25519(
  claims: JwtClaims,
  privateKey: KeyObject | string,
  header: Partial<Pick<JwtHeader, "kid">> = {},
): string {
  const key = typeof privateKey === "string" ? createPrivateKey(privateKey) : privateKey;
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error("signJwtEd25519 requires an Ed25519 private key");
  }
  const fullHeader: JwtHeader = { alg: "EdDSA", typ: "JWT", ...header };
  const claimsWithDefaults: JwtClaims = {
    iat: Math.floor(Date.now() / 1000),
    jti: randomUUID(),
    ...claims,
  };
  const headerB64 = b64urlEncode(JSON.stringify(fullHeader));
  const payloadB64 = b64urlEncode(JSON.stringify(claimsWithDefaults));
  const signingInput = `${headerB64}.${payloadB64}`;
  // Ed25519 uses null algorithm in Node's crypto.sign.
  const signature = cryptoSign(null, Buffer.from(signingInput, "utf8"), key);
  return `${signingInput}.${b64urlEncode(signature)}`;
}

export interface VerifyOptions {
  issuer?: string;
  audience?: string;
  /** Clock skew tolerance in seconds (default 30s). */
  clockToleranceSec?: number;
}

/** Verify + parse an EdDSA JWT. Throws on any failure. */
export function verifyJwtEd25519(
  token: string,
  publicKey: KeyObject | string,
  opts: VerifyOptions = {},
): { header: JwtHeader; claims: JwtClaims } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed JWT: expected 3 segments");
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = JSON.parse(b64urlDecode(headerB64).toString("utf8")) as JwtHeader;
  if (header.alg !== "EdDSA") {
    // Refuse HS256/RS256/none — algorithm confusion attacks.
    throw new Error(`Refusing to verify token with alg=${header.alg}; expected EdDSA`);
  }
  if (header.typ !== "JWT") throw new Error("Invalid JWT header typ");

  const key = typeof publicKey === "string" ? createPublicKey(publicKey) : publicKey;
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error("verifyJwtEd25519 requires an Ed25519 public key");
  }

  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, "utf8");
  const signature = b64urlDecode(signatureB64);
  const ok = cryptoVerify(null, signingInput, key, signature);
  if (!ok) throw new Error("JWT signature verification failed");

  const claims = JSON.parse(b64urlDecode(payloadB64).toString("utf8")) as JwtClaims;
  const now = Math.floor(Date.now() / 1000);
  const skew = opts.clockToleranceSec ?? 30;

  if (typeof claims.exp !== "number") throw new Error("JWT missing exp");
  if (now > claims.exp + skew) throw new Error("JWT expired");
  if (typeof claims.nbf === "number" && now + skew < claims.nbf) {
    throw new Error("JWT not yet valid (nbf)");
  }
  if (opts.issuer && claims.iss !== opts.issuer) {
    throw new Error(`JWT issuer mismatch: got ${claims.iss}, expected ${opts.issuer}`);
  }
  if (opts.audience) {
    const aud = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
    if (!aud.includes(opts.audience)) {
      throw new Error(`JWT audience mismatch: expected ${opts.audience}`);
    }
  }
  return { header, claims };
}
