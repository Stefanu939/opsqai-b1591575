// Bootstrap psql credential contract.
//
// Regression: init.js built its own psql environment with an EMPTY password in
// embedded mode, so every direct psql call (installation_state writes and the
// `SELECT public.kb_apply_embedding_dim(<dim>)` call behind the "configuring
// vector storage" stage) died with
//   psql: error: ... fe_sendauth: no password supplied
// reported as OPSQAI-E1507 — even though migrations had just succeeded using
// the very same embedded credentials from config.json.
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const INIT = join(import.meta.dirname, "..", "bootstrap", "init.js");
const PASSWORD = "Sup3r-Embedded-Pg-Pass";

/**
 * Sandboxed install: %ProgramData% and %ProgramFiles% both live in a temp dir,
 * with a fake psql.exe that records argv + the PG* environment it received and
 * refuses to authenticate when PGPASSWORD is empty (exactly like the real
 * cluster's scram verifier does).
 */
function sandbox(config: Record<string, unknown>, opts: { writePasswordOnFirstCall?: boolean } = {}) {
  const dataRoot = mkdtempSync(join(tmpdir(), "opsqai-pgcred-"));
  const configDir = join(dataRoot, "OPSQAI", "config");
  mkdirSync(configDir, { recursive: true });
  const configPath = join(configDir, "config.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

  const pfRoot = join(dataRoot, "pf");
  const binDir = join(pfRoot, "OPSQAI", "pgsql", "bin");
  mkdirSync(binDir, { recursive: true });
  const callLog = join(dataRoot, "psql-calls.log");
  const psql = join(binDir, "psql.exe");
  writeFileSync(
    psql,
    [
      "#!/usr/bin/env node",
      `const fs = require("fs");`,
      `const e = process.env;`,
      `fs.appendFileSync(${JSON.stringify(callLog)}, JSON.stringify({`,
      `  argv: process.argv.slice(2),`,
      `  PGHOST: e.PGHOST || "", PGPORT: e.PGPORT || "", PGDATABASE: e.PGDATABASE || "",`,
      `  PGUSER: e.PGUSER || "", PGPASSWORD: e.PGPASSWORD || "",`,
      `}) + "\\n");`,
      // Mirror libpq: no password -> fe_sendauth failure on stderr, non-zero.
      `if (!e.PGPASSWORD) {`,
      ...(opts.writePasswordOnFirstCall
        ? [
            // Stand in for the OpsqaiDatabase service, which generates the
            // embedded password during initdb and persists it to config.json
            // AFTER init.js already loaded its in-memory copy.
            `  const p = ${JSON.stringify(configPath)};`,
            `  const c = JSON.parse(fs.readFileSync(p, "utf8"));`,
            `  c.database.embedded.password = ${JSON.stringify(PASSWORD)};`,
            `  fs.writeFileSync(p, JSON.stringify(c, null, 2), "utf8");`,
          ]
        : []),
      `  process.stderr.write('psql: error: connection to server at "127.0.0.1", port 55432 failed: fe_sendauth: no password supplied\\n');`,
      `  process.exit(2);`,
      `}`,
      `process.exit(0);`,
    ].join("\n"),
    "utf8",
  );
  chmodSync(psql, 0o755);
  return { dataRoot, configPath, pfRoot, callLog };
}


function runInit(dataRoot: string, pfRoot: string, extraArgs: string[] = []) {
  return spawnSync(
    process.execPath,
    [
      INIT,
      ...extraArgs,
      "--admin-email", "owner@example.test",
      "--admin-password", "Admin-Pass-123",
      "--company", "Acme GmbH",
      "--start-services", "false",
    ],
    {
      env: { ...process.env, ProgramData: dataRoot, ProgramW6432: pfRoot, PGPASSWORD: "" },
      encoding: "utf8",
      timeout: 60_000,
    },
  );
}

type Call = {
  argv: string[];
  PGHOST: string;
  PGPORT: string;
  PGDATABASE: string;
  PGUSER: string;
  PGPASSWORD: string;
};

function calls(callLog: string): Call[] {
  if (!existsSync(callLog)) return [];
  return readFileSync(callLog, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Call);
}

function bootstrapLogs(dataRoot: string): string {
  const dir = join(dataRoot, "OPSQAI", "logs");
  if (!existsSync(dir)) return "";
  return readdirSync(dir)
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
}

const EMBEDDED = {
  version: "1.0.0",
  installId: "12345678-1234-4234-8234-123456789abc",
  database: { mode: "embedded", embedded: { port: 55432, password: PASSWORD } },
};

describe("bootstrap psql credentials", () => {
  it("passes the configured embedded password via PGPASSWORD (never in argv)", () => {
    const { dataRoot, pfRoot, callLog } = sandbox(EMBEDDED);
    runInit(dataRoot, pfRoot);

    const recorded = calls(callLog);
    expect(recorded.length).toBeGreaterThan(0);
    for (const c of recorded) {
      expect(c.PGPASSWORD).toBe(PASSWORD);
      expect(c.argv.join(" ")).not.toContain(PASSWORD);
      // Connection target is taken from the canonical config, like migrate.mjs.
      expect(c.argv).toContain("-h");
      expect(c.argv[c.argv.indexOf("-h") + 1]).toBe("127.0.0.1");
      expect(c.argv[c.argv.indexOf("-p") + 1]).toBe("55432");
      expect(c.argv[c.argv.indexOf("-U") + 1]).toBe("opsqai");
      expect(c.argv[c.argv.indexOf("-d") + 1]).toBe("opsqai");
      // -w: never prompt for a password on a headless child.
      expect(c.argv).toContain("-w");
    }
    rmSync(dataRoot, { recursive: true, force: true });
  });

  it("reproduces fe_sendauth when the password is absent from config", () => {
    // The pre-fix behaviour: no password reaches psql -> libpq fe_sendauth.
    const { dataRoot, pfRoot, callLog } = sandbox({
      ...EMBEDDED,
      database: { mode: "embedded", embedded: { port: 55432 } },
    });
    runInit(dataRoot, pfRoot);
    const recorded = calls(callLog);
    expect(recorded.length).toBeGreaterThan(0);
    expect(recorded.every((c) => c.PGPASSWORD === "")).toBe(true);
    rmSync(dataRoot, { recursive: true, force: true });
  });

  it("resolves external-mode credentials from the external database config", () => {
    const external = {
      host: "db.internal",
      port: 6432,
      username: "opsqai_app",
      database: "opsqai_prod",
      password: PASSWORD,
    };
    const { dataRoot, pfRoot, callLog } = sandbox({
      ...EMBEDDED,
      database: { mode: "external", external },
    });
    runInit(dataRoot, pfRoot, [
      "--db-mode", "external",
      "--db-external", JSON.stringify(external),
    ]);
    const recorded = calls(callLog);
    expect(recorded.length).toBeGreaterThan(0);
    for (const c of recorded) {
      expect(c.PGPASSWORD).toBe(PASSWORD);
      expect(c.argv[c.argv.indexOf("-h") + 1]).toBe("db.internal");
      expect(c.argv[c.argv.indexOf("-p") + 1]).toBe("6432");
      expect(c.argv[c.argv.indexOf("-U") + 1]).toBe("opsqai_app");
      expect(c.argv[c.argv.indexOf("-d") + 1]).toBe("opsqai_prod");
    }
    rmSync(dataRoot, { recursive: true, force: true });
  });

  it("never leaks the database password into stdout, stderr or the log file", () => {
    const { dataRoot, pfRoot } = sandbox(EMBEDDED);
    const r = runInit(dataRoot, pfRoot);
    expect(r.stdout || "").not.toContain(PASSWORD);
    expect(r.stderr || "").not.toContain(PASSWORD);
    expect(bootstrapLogs(dataRoot)).not.toContain(PASSWORD);
    rmSync(dataRoot, { recursive: true, force: true });
  });

  it("logs the sha256 of the init.js that actually executed", () => {
    // Makes "does the packaged installer contain the fix?" answerable from the
    // install log alone: this hash must equal the one build.ps1 prints.
    const { dataRoot, pfRoot } = sandbox(EMBEDDED);
    const r = runInit(dataRoot, pfRoot);
    const expected = createHash("sha256").update(readFileSync(INIT)).digest("hex");
    const out = `${r.stdout || ""}\n${bootstrapLogs(dataRoot)}`;
    expect(out).toContain(`[bootstrap] init.js sha256=${expected}`);
    rmSync(dataRoot, { recursive: true, force: true });
  });
});

