import { describe, it, expect } from "vitest";
import { assertNoBlacklistedSecrets, findBlacklistedSecretKeys } from "../mc-secrets-blacklist";

describe("MC secrets blacklist gate", () => {
  it("passes clean payloads", () => {
    expect(
      findBlacklistedSecretKeys({ install_id: "acme", company_name: "Acme", seats: 50 }),
    ).toEqual([]);
    expect(() => assertNoBlacklistedSecrets({ install_id: "acme", notes: "hi" })).not.toThrow();
  });

  it("permits legitimate keys that mention secrets (allow-list)", () => {
    expect(
      findBlacklistedSecretKeys({
        key_id: "ed25519-abc",
        public_key_pem: "-----BEGIN PUBLIC KEY-----",
        signed_token: "opsqai.v1....",
      }),
    ).toEqual([]);
  });

  it("rejects PostgreSQL password fields", () => {
    expect(() =>
      assertNoBlacklistedSecrets({ install_id: "acme", pg_password: "hunter2" }),
    ).toThrow(/pg_password/);
  });

  it("rejects SMTP credentials", () => {
    expect(() =>
      assertNoBlacklistedSecrets({ smtp_host: "smtp.example.com", smtp_user: "x", smtp_pass: "y" }),
    ).toThrow(/smtp/);
  });

  it("rejects AI provider API keys", () => {
    expect(() => assertNoBlacklistedSecrets({ openai_api_key: "sk-..." })).toThrow(/openai/);
    expect(() => assertNoBlacklistedSecrets({ azure_openai_api_key: "..." })).toThrow(
      /azure_openai/,
    );
  });

  it("rejects SSH keys and private keys", () => {
    expect(() => assertNoBlacklistedSecrets({ ssh_private_key: "..." })).toThrow(/ssh/);
    expect(() => assertNoBlacklistedSecrets({ private_key: "..." })).toThrow(/private_key/);
  });

  it("rejects nested blacklisted keys", () => {
    expect(() =>
      assertNoBlacklistedSecrets({ config: { database: { password: "leaked" } } }),
    ).toThrow(/config\.database\.password/);
  });

  it("rejects blacklisted keys inside arrays", () => {
    expect(() =>
      assertNoBlacklistedSecrets({ providers: [{ label: "azure", api_key: "..." }] }),
    ).toThrow(/providers\[0\]\.api_key/);
  });

  it("names the context in the error message", () => {
    expect(() =>
      assertNoBlacklistedSecrets({ smtp_password: "x" }, "issueLicense payload"),
    ).toThrow(/issueLicense payload/);
  });
});
