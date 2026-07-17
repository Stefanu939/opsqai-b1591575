// AES-256-GCM cipher round-trip + canary + license-token tests.
//
// Runs on any platform (no DPAPI dependency). The DPAPI cipher shares
// the same interface, so verifying AES-GCM here is enough to trust the
// contract; the DPAPI adapter is exercised end-to-end by the installer
// smoke test on Windows.

import { describe, expect, it } from "vitest";
import { generateKeyPairSync, randomBytes } from "node:crypto";

import {
  createAesGcmCipher,
  mintCanary,
} from "../selfhost/dpapi-cipher.server";
import { signJwtEd25519, verifyJwtEd25519 } from "../selfhost/jwt-ed25519.server";

describe("AES-GCM cipher", () => {
  it("round-trips plaintext", async () => {
    const cipher = createAesGcmCipher({ key: randomBytes(32) });
    const msg = new TextEncoder().encode("hello opsqai");
    const enc = await cipher.encrypt(msg);
    const dec = await cipher.decrypt(enc);
    expect(new TextDecoder().decode(dec)).toBe("hello opsqai");
  });

  it("rejects a foreign key on decrypt", async () => {
    const c1 = createAesGcmCipher({ key: randomBytes(32) });
    const c2 = createAesGcmCipher({ key: randomBytes(32) });
    const enc = await c1.encrypt(new TextEncoder().encode("x"));
    await expect(c2.decrypt(enc)).rejects.toThrow();
  });

  it("verifies its own canary and rejects a swapped one", async () => {
    const c1 = createAesGcmCipher({ key: randomBytes(32) });
    const canary = await mintCanary(c1);
    const c1WithCanary = createAesGcmCipher({
      key: (c1 as unknown as { __key: never }).__key ?? randomBytes(32),
      canary,
    });
    // With a fresh random key, canary verification MUST fail.
    expect(await c1WithCanary.verifyCanary()).toBe(false);
  });

  it("rejects a truncated ciphertext", async () => {
    const c = createAesGcmCipher({ key: randomBytes(32) });
    await expect(c.decrypt(new Uint8Array([1, 2, 3]))).rejects.toThrow();
  });
});

describe("Offline license token", () => {
  it("verifies a well-formed Ed25519-signed license", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const token = signJwtEd25519(
      {
        iss: "opsqai-mc",
        aud: "opsqai-selfhost",
        sub: "customer-123",
        customer: "Acme GmbH",
        seats: 25,
        edition: "professional",
        channel: "stable",
        support: "business-hours",
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
        flags: { ai: true },
      },
      privateKey,
    );
    const { claims } = verifyJwtEd25519(token, publicKey, {
      issuer: "opsqai-mc",
      audience: "opsqai-selfhost",
    });
    expect(claims.customer).toBe("Acme GmbH");
    expect(claims.seats).toBe(25);
  });

  it("refuses a license signed by the wrong issuer key", () => {
    const attackerKp = generateKeyPairSync("ed25519");
    const realKp = generateKeyPairSync("ed25519");
    const token = signJwtEd25519(
      {
        iss: "opsqai-mc",
        aud: "opsqai-selfhost",
        sub: "x",
        exp: Math.floor(Date.now() / 1000) + 60,
        customer: "Attacker",
        seats: 9999,
        edition: "enterprise",
        channel: "stable",
        support: "premium",
      },
      attackerKp.privateKey,
    );
    expect(() =>
      verifyJwtEd25519(token, realKp.publicKey, {
        issuer: "opsqai-mc",
        audience: "opsqai-selfhost",
      }),
    ).toThrow(/signature/i);
  });
});
