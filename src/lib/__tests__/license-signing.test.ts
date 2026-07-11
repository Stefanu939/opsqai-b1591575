import { describe, it, expect } from "vitest";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import {
  verifyLicenseTokenTyped,
  peekTokenKeyId,
  type InstallLicensePayload,
  type ModuleLicensePayload,
} from "../license-signing.server";

// ─── Test helpers (mirror the internal signing path so we don't need DB) ──

function b64url(buf: Buffer | string): string {
  return (typeof buf === "string" ? Buffer.from(buf) : buf)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function makeKeypair() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKey,
  };
}

function signToken(payload: object, privateKey: ReturnType<typeof makeKeypair>["privateKey"]): string {
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = edSign(null, Buffer.from(payloadB64), privateKey);
  return `opsqai.v1.${payloadB64}.${b64url(sig)}`;
}

const NOW = 1_700_000_000;

function baseInstall(overrides: Partial<InstallLicensePayload> = {}): InstallLicensePayload {
  return {
    license_version: 1,
    kind: "install",
    install_id: "acme-prod",
    key_id: "ed25519-test01",
    customer: "Acme GmbH",
    seats: 500,
    issued_at: NOW - 100,
    expires_at: NOW + 3600 * 24 * 365,
    maintenance_expires_at: NOW + 3600 * 24 * 365,
    ...overrides,
  };
}

function baseModule(overrides: Partial<ModuleLicensePayload> = {}): ModuleLicensePayload {
  return {
    license_version: 1,
    kind: "module",
    install_id: "acme-prod",
    key_id: "ed25519-test01",
    module: "academy",
    issued_at: NOW - 100,
    expires_at: NOW + 3600 * 24 * 365,
    maintenance_expires_at: NOW + 3600 * 24 * 365,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("license-signing (Phase 0)", () => {
  describe("install-license roundtrip", () => {
    it("verifies a well-formed install token", () => {
      const kp = makeKeypair();
      const payload = baseInstall();
      const token = signToken(payload, kp.privateKey);
      const res = verifyLicenseTokenTyped(token, kp.publicPem, "install", NOW);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.payload.kind).toBe("install");
        expect(res.payload.seats).toBe(500);
        expect(res.payload.customer).toBe("Acme GmbH");
      }
    });
  });

  describe("module-license roundtrip", () => {
    it("verifies a well-formed module token", () => {
      const kp = makeKeypair();
      const payload = baseModule();
      const token = signToken(payload, kp.privateKey);
      const res = verifyLicenseTokenTyped(token, kp.publicPem, "module", NOW);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.payload.kind).toBe("module");
        expect(res.payload.module).toBe("academy");
      }
    });
  });

  describe("tampered signature", () => {
    it("rejects a token whose payload was altered post-signing", () => {
      const kp = makeKeypair();
      const token = signToken(baseInstall(), kp.privateKey);
      // Flip a byte in the payload segment
      const parts = token.split(".");
      const tampered = Buffer.from(parts[2].replace(/-/g, "+").replace(/_/g, "/"), "base64");
      tampered[0] = tampered[0] ^ 0xff;
      parts[2] = b64url(tampered);
      const badToken = parts.join(".");
      const res = verifyLicenseTokenTyped(badToken, kp.publicPem, "install", NOW);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe("bad_signature");
    });
  });

  describe("expired token", () => {
    it("rejects an install token past its expires_at", () => {
      const kp = makeKeypair();
      const token = signToken(baseInstall({ expires_at: NOW - 10 }), kp.privateKey);
      const res = verifyLicenseTokenTyped(token, kp.publicPem, "install", NOW);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe("expired");
    });

    it("accepts a token with null expires_at (perpetual)", () => {
      const kp = makeKeypair();
      const token = signToken(baseInstall({ expires_at: null }), kp.privateKey);
      const res = verifyLicenseTokenTyped(token, kp.publicPem, "install", NOW);
      expect(res.ok).toBe(true);
    });
  });

  describe("unknown license_version", () => {
    it("rejects a token whose payload declares a future license_version", () => {
      const kp = makeKeypair();
      const payload = { ...baseInstall(), license_version: 2 };
      const token = signToken(payload, kp.privateKey);
      const res = verifyLicenseTokenTyped(token, kp.publicPem, "install", NOW);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe("unknown_license_version");
    });
  });

  describe("cross-kind rejection", () => {
    it("rejects an install token when a module token is expected", () => {
      const kp = makeKeypair();
      const token = signToken(baseInstall(), kp.privateKey);
      const res = verifyLicenseTokenTyped(token, kp.publicPem, "module", NOW);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe("wrong_kind");
    });

    it("rejects a module token when an install token is expected", () => {
      const kp = makeKeypair();
      const token = signToken(baseModule(), kp.privateKey);
      const res = verifyLicenseTokenTyped(token, kp.publicPem, "install", NOW);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe("wrong_kind");
    });
  });

  describe("wrong public key", () => {
    it("rejects a token verified against a different keypair's public key", () => {
      const kp1 = makeKeypair();
      const kp2 = makeKeypair();
      const token = signToken(baseInstall(), kp1.privateKey);
      const res = verifyLicenseTokenTyped(token, kp2.publicPem, "install", NOW);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe("bad_signature");
    });
  });

  describe("malformed token", () => {
    it("rejects tokens that don't start with opsqai.v1", () => {
      const kp = makeKeypair();
      const res = verifyLicenseTokenTyped("nope.v1.aaa.bbb", kp.publicPem, "install", NOW);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe("bad_signature");
    });

    it("rejects tokens with the wrong number of segments", () => {
      const kp = makeKeypair();
      const res = verifyLicenseTokenTyped("opsqai.v1.aaa", kp.publicPem, "install", NOW);
      expect(res.ok).toBe(false);
    });
  });

  describe("peekTokenKeyId", () => {
    it("extracts key_id without verifying the signature", () => {
      const kp = makeKeypair();
      const token = signToken(baseInstall({ key_id: "ed25519-abc12345" }), kp.privateKey);
      expect(peekTokenKeyId(token)).toBe("ed25519-abc12345");
    });

    it("returns null on malformed input", () => {
      expect(peekTokenKeyId("garbage")).toBeNull();
    });
  });
});
