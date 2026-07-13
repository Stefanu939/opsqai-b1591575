import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeSecretsEnv, secretsEnvPath } from "@/lib/first-run.server";

describe("writeSecretsEnv", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "opsqai-secrets-"));
    process.env.OPSQAI_SECRETS_ENV_PATH = path.join(tmp, "secrets.env");
  });

  afterEach(async () => {
    delete process.env.OPSQAI_SECRETS_ENV_PATH;
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("writes a fresh file with 0600 permissions", async () => {
    await writeSecretsEnv({ SMTP_PASSWORD: "hunter2" });
    const stat = await fs.stat(secretsEnvPath());
    // Compare only the low 9 permission bits — the top bits vary by platform.
    expect(stat.mode & 0o777).toBe(0o600);
    const body = await fs.readFile(secretsEnvPath(), "utf8");
    expect(body).toContain("SMTP_PASSWORD='hunter2'");
  });

  it("merges updates without duplicating existing keys", async () => {
    await writeSecretsEnv({ SMTP_PASSWORD: "one", SMTP_HOST: "smtp.example.com" });
    await writeSecretsEnv({ SMTP_PASSWORD: "two" });
    const body = await fs.readFile(secretsEnvPath(), "utf8");
    expect(body).toContain("SMTP_PASSWORD='two'");
    expect(body).not.toContain("SMTP_PASSWORD='one'");
    expect(body).toContain("SMTP_HOST='smtp.example.com'");
  });

  it("escapes single quotes for POSIX shell safety", async () => {
    await writeSecretsEnv({ WEIRD_KEY: "it's a \"trap\"" });
    const body = await fs.readFile(secretsEnvPath(), "utf8");
    expect(body).toContain("WEIRD_KEY='it'\\''s a \"trap\"'");
  });

  it("rejects invalid secret names", async () => {
    await expect(writeSecretsEnv({ "bad key": "x" } as never)).rejects.toThrow(/Invalid/);
    await expect(writeSecretsEnv({ "a": "x" })).rejects.toThrow(/Invalid/);
  });
});
