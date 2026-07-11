// Phase 5.5 — Bootstrap Recovery Token tests.

import { describe, it, expect, beforeAll } from "vitest";
import { generateKeyPairSync, createPrivateKey, sign as edSign } from "node:crypto";

// Mock license-signing to avoid touching Supabase in tests.
let PRIV_PEM = "";
let PUB_PEM = "";
const KEY_ID = "ed25519-test-dr";

vi.mock("@/lib/license-signing.server", () => ({
  getActiveSigningKey: async () => ({ privatePem: PRIV_PEM, publicPem: PUB_PEM, keyId: KEY_ID }),
}));

import { vi } from "vitest";
import { signBootstrapToken, verifyBootstrapToken, peekBootstrapKeyId } from "@/lib/dr-tokens.server";

beforeAll(() => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  PRIV_PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  PUB_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();
});

describe("bootstrap recovery token", () => {
  it("roundtrips sign → verify", async () => {
    const { token, payload } = await signBootstrapToken({ install_id: "acme-prod" });
    expect(payload.kind).toBe("dr_bootstrap");
    expect(payload.dr_version).toBe(1);
    expect(peekBootstrapKeyId(token)).toBe(KEY_ID);
    const r = verifyBootstrapToken(token, PUB_PEM, { expectedInstallId: "acme-prod" });
    expect(r.ok).toBe(true);
  });

  it("rejects install_id mismatch", async () => {
    const { token } = await signBootstrapToken({ install_id: "acme-prod" });
    const r = verifyBootstrapToken(token, PUB_PEM, { expectedInstallId: "other-install" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("install_mismatch");
  });

  it("rejects expired tokens", async () => {
    const { token, payload } = await signBootstrapToken({ install_id: "acme-prod", ttl_seconds: 60 });
    const r = verifyBootstrapToken(token, PUB_PEM, {
      expectedInstallId: "acme-prod",
      now: payload.expires_at + 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("expired");
  });

  it("rejects tampered payload", async () => {
    const { token } = await signBootstrapToken({ install_id: "acme-prod" });
    const parts = token.split(".");
    // Flip a base64url char in the payload.
    const p = parts[2];
    parts[2] = p.slice(0, -1) + (p.endsWith("A") ? "B" : "A");
    const tampered = parts.join(".");
    const r = verifyBootstrapToken(tampered, PUB_PEM, { expectedInstallId: "acme-prod" });
    expect(r.ok).toBe(false);
  });

  it("rejects malformed envelopes", () => {
    const r = verifyBootstrapToken("not-a-token", PUB_PEM, { expectedInstallId: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("malformed");
  });

  it("rejects unknown dr_version", () => {
    // Hand-craft a token with dr_version=99, signed with our key.
    const payload = {
      dr_version: 99, kind: "dr_bootstrap", install_id: "acme-prod",
      nonce: "n", key_id: KEY_ID, issued_at: 1, expires_at: 2 ** 31,
    };
    const b64 = Buffer.from(JSON.stringify(payload)).toString("base64")
      .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
    const sig = edSign(null, Buffer.from(b64), createPrivateKey(PRIV_PEM));
    const sigB64 = sig.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
    const token = `opsqai-dr.v1.${b64}.${sigB64}`;
    const r = verifyBootstrapToken(token, PUB_PEM, { expectedInstallId: "acme-prod" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unknown_dr_version");
  });
});
