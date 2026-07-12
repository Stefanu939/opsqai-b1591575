import { describe, expect, it, vi } from "vitest";
import { decodeTokenPayload } from "../license";
import { signLicense } from "../license-signing.server";

const signingKeys = vi.hoisted(() => {
  return {
    privatePem:
      "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIDfpr2chqUi9fOL0H6vS/jnlxXzaIbqHUsXNWbrxWrGI\n-----END PRIVATE KEY-----\n",
    publicPem:
      "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA7175M9mB53aR4Xf+why0cb/eyQL0DSbkz+C0XbjAeFs=\n-----END PUBLIC KEY-----\n",
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