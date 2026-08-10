// Startup contract regressions:
//   - the platform service refuses to launch the app without a valid installId
//     (the real failure was "Missing environment variable: OPSQAI_INSTALL_ID"
//     surfacing as an HTTP 500 restart loop)
//   - the migration runner creates the "opsqai" database when it is missing and
//     leaves an existing one alone
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SERVICES = join(import.meta.dirname, "..");
const skipOnWindows = process.platform === "win32";

function workspace(cfg: unknown) {
  const dir = mkdtempSync(join(tmpdir(), "opsqai-start-"));
  const configPath = join(dir, "config.json");
  writeFileSync(configPath, `\uFEFF${JSON.stringify(cfg, null, 2)}`, "utf8");
  return { dir, configPath };
}

const baseConfig = (installId: string | null) => ({
  version: "1.0.0",
  ...(installId === null ? {} : { installId }),
  company: { name: "Acme" },
  database: { mode: "embedded", embedded: { port: 55432, password: "pw" } },
  ai: { provider: "ollama" },
});

describe("platform service startup", () => {
  it("exits with a config error and never spawns the app when installId is missing", () => {
    const { dir, configPath } = workspace(baseConfig(null));
    const r = spawnSync(process.execPath, [join(SERVICES, "platform", "index.js")], {
      env: { ...process.env, OPSQAI_CONFIG: configPath },
      encoding: "utf8",
    });
    expect(r.status).toBe(78);
    expect(r.stderr).toMatch(/no valid installId/);
    expect(r.stderr).toContain(configPath);
    expect(r.stdout).not.toMatch(/Launching app/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("exits with a config error when config.json is missing", () => {
    const r = spawnSync(process.execPath, [join(SERVICES, "platform", "index.js")], {
      env: { ...process.env, OPSQAI_CONFIG: join(tmpdir(), "opsqai-absent", "config.json") },
      encoding: "utf8",
    });
    expect(r.status).toBe(78);
    expect(r.stderr).toMatch(/OPSQAI config not found/);
  });

  it("forwards the canonical installId from config.json to the app process", () => {
    const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const { dir, configPath } = workspace(baseConfig(id));
    const r = spawnSync(process.execPath, [join(SERVICES, "platform", "index.js")], {
      env: { ...process.env, OPSQAI_CONFIG: configPath },
      encoding: "utf8",
    });
    // The staged app bundle does not exist here, so the child exits — what
    // matters is that config loading succeeded and the ID was resolved.
    expect(r.stdout).toContain(`install_id=${id}`);
    expect(r.stdout).toMatch(/Launching app on 127\.0\.0\.1:3000/);
    expect(r.stdout).toMatch(/health probe: http:\/\/127\.0\.0\.1:3000\/health/);
    expect(r.status).not.toBe(78);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("database service startup", () => {
  it("fails loudly with the config path instead of looping on a bad config", () => {
    const dir = mkdtempSync(join(tmpdir(), "opsqai-db-"));
    const configPath = join(dir, "config.json");
    writeFileSync(configPath, "{ broken", "utf8");
    const r = spawnSync(process.execPath, [join(SERVICES, "database", "index.js")], {
      env: { ...process.env, OPSQAI_CONFIG: configPath },
      encoding: "utf8",
    });
    expect(r.status).toBe(78);
    expect(r.stderr).toMatch(/cannot load OPSQAI config/);
    expect(r.stderr).toContain(configPath);
    rmSync(dir, { recursive: true, force: true });
  });
});

/** Installed-layout sandbox: <root>/app/migrations + <root>/pgsql/bin/psql.exe */
function installRoot(opts: { dbExists: boolean }) {
  const root = mkdtempSync(join(tmpdir(), "opsqai-install-"));
  const server = join(root, "app", "server");
  mkdirSync(server, { recursive: true });
  mkdirSync(join(root, "app", "migrations"), { recursive: true });
  mkdirSync(join(root, "pgsql", "bin"), { recursive: true });
  writeFileSync(join(root, "app", "migrations", "0001_test.sql"), "SELECT 1;\n");
  writeFileSync(
    join(server, "migrate.mjs"),
    readFileSync(join(SERVICES, "bootstrap", "migrate.mjs"), "utf8"),
  );
  writeFileSync(
    join(server, "errors.cjs"),
    readFileSync(join(SERVICES, "bootstrap", "errors.cjs"), "utf8"),
  );

  const log = join(root, "psql-calls.log");
  const psql = join(root, "pgsql", "bin", "psql.exe");
  // Fake psql: records every invocation and answers the three probes the
  // migrator makes (ping, pg_database lookup, everything else).
  writeFileSync(
    psql,
    [
      "#!/bin/sh",
      `echo "$@" >> "${log}"`,
      'case "$*" in',
      '  *"FROM pg_database"*)',
      opts.dbExists ? '    echo 1;;' : "    echo '';;",
      "  *) exit 0;;",
      "esac",
      "",
    ].join("\n"),
    { mode: 0o755 },
  );
  chmodSync(psql, 0o755);

  const configPath = join(root, "config.json");
  writeFileSync(
    configPath,
    `\uFEFF${JSON.stringify({
      installId: "11111111-2222-3333-4444-555555555555",
      database: { mode: "embedded", embedded: { port: 55432, password: "pw" } },
    })}`,
    "utf8",
  );
  return { root, configPath, migrate: join(server, "migrate.mjs"), log };
}

describe("migration runner", () => {
  it.skipIf(skipOnWindows)("creates the opsqai database when it is missing", () => {
    const { root, configPath, migrate, log } = installRoot({ dbExists: false });
    const r = spawnSync(process.execPath, [migrate], {
      env: { ...process.env, OPSQAI_CONFIG: configPath },
      encoding: "utf8",
    });
    const calls = readFileSync(log, "utf8");
    expect(calls).toMatch(/CREATE DATABASE "opsqai" OWNER "opsqai"/);
    expect(r.stdout).toContain('database "opsqai" ready');
    rmSync(root, { recursive: true, force: true });
  });

  it.skipIf(skipOnWindows)("never recreates an existing database", () => {
    const { root, configPath, migrate, log } = installRoot({ dbExists: true });
    const r = spawnSync(process.execPath, [migrate], {
      env: { ...process.env, OPSQAI_CONFIG: configPath },
      encoding: "utf8",
    });
    expect(readFileSync(log, "utf8")).not.toMatch(/CREATE DATABASE/);
    expect(r.stdout).toContain('database "opsqai" ready');
    rmSync(root, { recursive: true, force: true });
  });

  it.skipIf(skipOnWindows)("resolves the architectural installed layout, not a flat one", () => {
    // app/server/migrate.mjs -> app/migrations + pgsql/bin/psql.exe
    const { root, configPath, migrate } = installRoot({ dbExists: true });
    const r = spawnSync(process.execPath, [migrate], {
      env: { ...process.env, OPSQAI_CONFIG: configPath },
      encoding: "utf8",
    });
    expect(r.stdout + r.stderr).not.toMatch(/psql\.exe not found/);
    expect(r.stdout + r.stderr).not.toMatch(/migrations not found/);
    rmSync(root, { recursive: true, force: true });
  });

  it.skipIf(skipOnWindows)("accepts a config.json written with a UTF-8 BOM", () => {
    const { root, configPath, migrate } = installRoot({ dbExists: true });
    const r = spawnSync(process.execPath, [migrate], {
      env: { ...process.env, OPSQAI_CONFIG: configPath },
      encoding: "utf8",
    });
    expect(r.stdout + r.stderr).not.toMatch(/Unexpected token/);
    expect(r.stdout + r.stderr).not.toMatch(/OPSQAI-E1901/);
    rmSync(root, { recursive: true, force: true });
  });
});
