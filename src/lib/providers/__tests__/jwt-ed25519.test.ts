// Ed25519 JWT unit tests.
//
// Verifies the signer refuses non-EdDSA keys, produces tokens that
// verify, and rejects alg-confusion / expired / tampered tokens.

import { describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";

import {
  signJwtEd25519,
  verifyJwtEd25519,
} from "../selfhost/jwt-ed25519.server";

function newKeyPair() {
  return generateKeyPairSync("ed25519");
}

describe("Ed25519 JWT", () => {
  it("signs and verifies a valid token", () => {
    const { privateKey, publicKey } = newKeyPair();
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = signJwtEd25519(
      { iss: "opsqai-selfhost", aud: "opsqai-app", sub: "user-1", exp },
      privateKey,
    );
    const { claims, header } = verifyJwtEd25519(token, publicKey, {
      issuer: "opsqai-selfhost",
      audience: "opsqai-app",
    });
    expect(header.alg).toBe("EdDSA");
    expect(claims.sub).toBe("user-1");
  });

  it("rejects tampered signatures", () => {
    const { privateKey, publicKey } = newKeyPair();
    const token = signJwtEd25519(
      { sub: "u", exp: Math.floor(Date.now() / 1000) + 60 },
      privateKey,
    );
    const [h, p] = token.split(".");
    const tampered = `${h}.${p}.AAAA`;
    expect(() => verifyJwtEd25519(tampered, publicKey)).toThrow(/signature/i);
  });

  it("refuses to verify HS256/none/alg-confused tokens", () => {
    const { publicKey } = newKeyPair();
    const fakeHeader = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");
    const fakePayload = Buffer.from(
      JSON.stringify({ sub: "x", exp: Math.floor(Date.now() / 1000) + 60 }),
    ).toString("base64url");
    const token = `${fakeHeader}.${fakePayload}.AAAA`;
    expect(() => verifyJwtEd25519(token, publicKey)).toThrow(/EdDSA/);
  });

  it("rejects expired tokens (beyond clock skew)", () => {
    const { privateKey, publicKey } = newKeyPair();
    const token = signJwtEd25519(
      { sub: "u", exp: Math.floor(Date.now() / 1000) - 120 },
      privateKey,
    );
    expect(() => verifyJwtEd25519(token, publicKey, { clockToleranceSec: 5 })).toThrow(
      /expired/i,
    );
  });

  it("enforces issuer and audience", () => {
    const { privateKey, publicKey } = newKeyPair();
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = signJwtEd25519(
      { iss: "wrong", aud: "wrong", sub: "u", exp },
      privateKey,
    );
    expect(() =>
      verifyJwtEd25519(token, publicKey, { issuer: "opsqai-selfhost" }),
    ).toThrow(/issuer/i);
    expect(() =>
      verifyJwtEd25519(token, publicKey, { audience: "opsqai-app" }),
    ).toThrow(/audience/i);
  });

  it("refuses non-Ed25519 keys", () => {
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
    expect(() =>
      signJwtEd25519({ sub: "u", exp: Math.floor(Date.now() / 1000) + 60 }, rsa.privateKey),
    ).toThrow(/Ed25519/);
  });
});
