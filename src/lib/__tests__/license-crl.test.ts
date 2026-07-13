import { describe, it, expect } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { signCrl, verifyCrl, peekCrlKeyId, type CrlPayload } from "@/lib/license-crl.server";

function newKey() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

const samplePayload = (): CrlPayload => ({
  crl_version: 1,
  key_id: "ed25519-test",
  issued_at: 1_700_000_000,
  entries: [
    {
      install_id: "acme-prod",
      kind: "install",
      module_key: null,
      revoked: true,
      suspended: false,
      revoked_at: "2026-01-01T00:00:00Z",
      suspended_at: null,
    },
    {
      install_id: "acme-prod",
      kind: "module",
      module_key: "sop",
      revoked: false,
      suspended: true,
      revoked_at: null,
      suspended_at: "2026-02-01T00:00:00Z",
    },
  ],
});

describe("license CRL", () => {
  it("signs and verifies a round-trip CRL", () => {
    const { privatePem, publicPem } = newKey();
    const token = signCrl(samplePayload(), privatePem);
    const res = verifyCrl(token, publicPem);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.payload.crl_version).toBe(1);
      expect(res.payload.entries).toHaveLength(2);
    }
  });

  it("rejects tampered payload", () => {
    const { privatePem, publicPem } = newKey();
    const token = signCrl(samplePayload(), privatePem);
    const parts = token.split(".");
    // flip a byte in the payload
    parts[2] = parts[2].slice(0, -2) + (parts[2].endsWith("A") ? "B" : "A");
    const res = verifyCrl(parts.join("."), publicPem);
    expect(res.ok).toBe(false);
  });

  it("rejects a token signed by a different key", () => {
    const a = newKey();
    const b = newKey();
    const token = signCrl(samplePayload(), a.privatePem);
    const res = verifyCrl(token, b.publicPem);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("bad_signature");
  });

  it("rejects malformed envelopes", () => {
    const { publicPem } = newKey();
    const res = verifyCrl("not-a-token", publicPem);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("malformed");
  });

  it("peekCrlKeyId returns the key id without verifying", () => {
    const { privatePem } = newKey();
    const token = signCrl(samplePayload(), privatePem);
    expect(peekCrlKeyId(token)).toBe("ed25519-test");
    expect(peekCrlKeyId("garbage")).toBeNull();
  });

  it("rejects unknown crl_version", () => {
    const { privatePem, publicPem } = newKey();
    const bad = { ...samplePayload(), crl_version: 2 as unknown as 1 };
    const token = signCrl(bad, privatePem);
    const res = verifyCrl(token, publicPem);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("unknown_crl_version");
  });
});
