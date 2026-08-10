// Bootstrap contract: ONE canonical persisted installId, and an existing
// embedded PostgreSQL password/port survives every re-run (a regenerated
// password no longer matches the SCRAM verifier in the pgsql data dir, which is
// the classic "password authentication failed for user opsqai" / OPSQAI-E1101).
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const INIT = join(import.meta.dirname, "..", "bootstrap", "init.js");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function sandbox(priorConfig?: unknown, withBom = false) {
  const dataRoot = mkdtempSync(join(tmpdir(), "opsqai-pd-"));
  const configDir = join(dataRoot, "OPSQAI", "config");
  mkdirSync(configDir, { recursive: true });
  const configPath = join(configDir, "config.json");
  if (priorConfig !== undefined) {
    const body = JSON.stringify(priorConfig, null, 2);
    writeFileSync(configPath, withBom ? `\uFEFF${body}` : body, "utf8");
  }
  return { dataRoot, configPath };
}

function runInit(dataRoot: string) {
  return spawnSync(
    process.execPath,
    [
      INIT,
      "--admin-email", "owner@example.test",
      "--admin-password", "Sup3r-Secret-Pass",
      "--company", "Acme GmbH",
      "--start-services", "false",
    ],
    {
      // init.js derives every path from %ProgramData% / %ProgramFiles%; nothing
      // machine-specific is hardcoded, so a temp root fully isolates the run.
      env: { ...process.env, ProgramData: dataRoot, ProgramW6432: join(dataRoot, "pf") },
      encoding: "utf8",
      timeout: 60_000,
    },
  );
}

const readConfig = (p: string) => JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, ""));

describe("bootstrap installId contract", () => {
  it("generates and persists a UUID installId on a fresh install", () => {
    const { dataRoot, configPath } = sandbox();
    const r = runInit(dataRoot);
    expect(r.stdout).toMatch(/generated installId/);
    const cfg = readConfig(configPath);
    expect(cfg.installId).toMatch(UUID_RE);
    rmSync(dataRoot, { recursive: true, force: true });
  });

  it("preserves an existing installId and embedded password on re-run (upgrade)", () => {
    const prior = {
      version: "1.0.0",
      installId: "12345678-1234-4234-8234-123456789abc",
      database: { mode: "embedded", embedded: { port: 55999, password: "keep-this-password" } },
    };
    // Written WITH a BOM on purpose: this exact combination used to abort
    // bootstrap with `Unexpected token '\uFEFF'`.
    const { dataRoot, configPath } = sandbox(prior, true);
    const r = runInit(dataRoot);
    expect(r.stdout).toMatch(/preserving existing installId 12345678-1234-4234-8234-123456789abc/);
    const cfg = readConfig(configPath);
    expect(cfg.installId).toBe(prior.installId);
    expect(cfg.database.embedded.password).toBe("keep-this-password");
    expect(cfg.database.embedded.port).toBe(55999);
    rmSync(dataRoot, { recursive: true, force: true });
  });

  it("keeps the same installId across two consecutive bootstrap runs", () => {
    const { dataRoot, configPath } = sandbox();
    runInit(dataRoot);
    const first = readConfig(configPath).installId;
    runInit(dataRoot);
    expect(readConfig(configPath).installId).toBe(first);
    rmSync(dataRoot, { recursive: true, force: true });
  });

  it("never overwrites a stored password with an empty one", () => {
    const { dataRoot, configPath } = sandbox({
      installId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      database: { mode: "embedded", embedded: { port: 55432, password: "scram-sync" } },
    });
    runInit(dataRoot);
    expect(readConfig(configPath).database.embedded.password).toBe("scram-sync");
    rmSync(dataRoot, { recursive: true, force: true });
  });
});
