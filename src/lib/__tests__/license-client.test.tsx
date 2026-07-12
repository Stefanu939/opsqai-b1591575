import { describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { decodeTokenPayload } from "../license";
import { signLicense } from "../license-signing.server";

const signingKeys = vi.hoisted(() => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    keyId: "ed25519-client-test",
  };
});

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({
                data: {
                  private_key_pem: signingKeys.privatePem,
                  public_key_pem: signingKeys.publicPem,
                  key_id: signingKeys.keyId,
                },
              }),
            }),
          }),
        }),
      }),
      insert: async () => ({ error: null }),
    }),
  },
}));

describe("client license token payload decoding", () => {
  it("decodes a real opsqai.v1 token signed by signLicense", async () => {
    const input = {
      install_id: "install-prod-001",
      company_name: "Acme Operations GmbH",
      tier: "enterprise" as const,
      modules: ["knowledge", "academy", "analytics"],
      max_users: 250,
      issued_at: 1_700_000_000,
      expires_at: 1_733_000_000,
      maintenance_expires_at: 1_764_000_000,
    };

    const { token } = await signLicense(input);
    const decoded = decodeTokenPayload(token);

    expect(token.split(".")).toHaveLength(4);
    expect(decoded).toMatchObject({
      ...input,
      key_id: signingKeys.keyId,
    });
    expect(decoded?.install_id).toBe(input.install_id);
    expect(decoded?.tier).toBe(input.tier);
    expect(decoded?.modules).toEqual(input.modules);
    expect(decoded?.expires_at).toBe(input.expires_at);
    expect(decoded?.maintenance_expires_at).toBe(input.maintenance_expires_at);
  });

  it("returns null for malformed tokens", () => {
    expect(decodeTokenPayload("nope.v1.payload.signature")).toBeNull();
    expect(decodeTokenPayload("opsqai.v1.payload")).toBeNull();
    expect(decodeTokenPayload("opsqai.v2.payload.signature")).toBeNull();
  });
});