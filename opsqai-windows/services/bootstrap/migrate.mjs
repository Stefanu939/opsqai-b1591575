// OPSQAI Windows migration runner.
// Runs inside the installed Windows payload with bundled Node and psql.exe.
//
// Emits structured failure lines the wizard renderer keys off:
//   [migrate] FAIL code=OPSQAI-E1001 file=0001_bootstrap.sql line=61 sqlstate=42704 message="..."
// See services/bootstrap/errors.cjs for the code catalog.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Resolve errors.cjs from either the staged app layout (beside this file)
// or the source layout (../../services/bootstrap/errors.cjs). If neither
// exists, emit a stable OPSQAI-E1902 line and exit — never crash Node
// with an unstructured MODULE_NOT_FOUND stack.
const _here = dirname(fileURLToPath(import.meta.url));
const _errorCandidates = [
  join(_here, "errors.cjs"),
  join(_here, "..", "..", "services", "bootstrap", "errors.cjs"),
  join(_here, "..", "..", "..", "services", "bootstrap", "errors.cjs"),
];
const _errorsPath = _errorCandidates.find((p) => existsSync(p));
if (!_errorsPath) {
  console.log(
    `[migrate] FAIL code=OPSQAI-E1902 dir=${JSON.stringify(_here)} ` +
      `message="Installer payload incomplete. Missing: errors.cjs"`,
  );
  process.exit(5);
}
const { formatFail } = require(_errorsPath);

const here = dirname(fileURLToPath(import.meta.url));
const installRoot = resolve(here, "..", "..");
const programData = process.env.ProgramData || "C:\\ProgramData";
const configPath =
  process.env.OPSQAI_CONFIG || join(programData, "OPSQAI", "config", "config.json");
const migrationsDir = join(installRoot, "app", "migrations");
const migrationsManifestPath = join(installRoot, "app", "migrations.manifest.json");
const psql = join(installRoot, "pgsql", "bin", "psql.exe");

function emit(line) {
  console.log(line);
}
function fail(code, fields, exit = 1) {
  emit(formatFail("migrate", code, fields));
  process.exit(exit);
}

if (!existsSync(configPath)) fail("OPSQAI-E1901", { message: `config not found at ${configPath}` });
if (!existsSync(migrationsDir)) fail("OPSQAI-E1901", { message: `migrations not found at ${migrationsDir}` });
if (!existsSync(psql)) fail("OPSQAI-E1101", { message: `psql.exe not found at ${psql}` });

const cfg = JSON.parse(readFileSync(configPath, "utf8"));

function databaseEnv() {
  if (cfg.database?.mode === "external") {
    const db = cfg.database.external || {};
    return {
      PGHOST: db.host,
      PGPORT: String(db.port || 5432),
      PGDATABASE: db.database || "opsqai",
      PGUSER: db.username || "opsqai",
      PGPASSWORD: db.password || "",
    };
  }
  const embedded = cfg.database?.embedded || {};
  return {
    PGHOST: "127.0.0.1",
    PGPORT: String(embedded.port || 55432),
    PGDATABASE: "opsqai",
    PGUSER: "opsqai",
    PGPASSWORD: embedded.password || "",
  };
}

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

function sha256File(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function loadMigrationManifest() {
  if (!existsSync(migrationsManifestPath)) {
    console.log(`[migrate] migration manifest missing at ${migrationsManifestPath}`);
    return new Map();
  }
  try {
    const parsed = JSON.parse(readFileSync(migrationsManifestPath, "utf8"));
    const entries = Array.isArray(parsed.migrations) ? parsed.migrations : [];
    const map = new Map(entries.map((m) => [String(m.filename), String(m.sha256 || "").toLowerCase()]));
    console.log(`[migrate] migration manifest loaded (${map.size} fingerprint(s))`);
    return map;
  } catch (e) {
    fail("OPSQAI-E1902", {
      file: "migrations.manifest.json",
      message: `migration manifest is unreadable: ${e.message}`,
    });
  }
}

const manifest = loadMigrationManifest();
const fingerprints = new Map();
for (const file of files) {
  const actual = sha256File(join(migrationsDir, file));
  const expected = manifest.get(file);
  if (expected && expected !== actual) {
    fail("OPSQAI-E1902", {
      file,
      migration_sha: actual,
      expected_sha: expected,
      message: "migration payload hash mismatch",
    });
  }
  fingerprints.set(file, actual);
}

if (files.length === 0) {
  console.log("[migrate] no SQL migrations bundled");
  process.exit(0);
}

const env = { ...process.env, ...databaseEnv(), ON_ERROR_STOP: "1" };

function psqlRun(runEnv, args, opts = {}) {
  return spawnSync(psql, ["-v", "ON_ERROR_STOP=1", ...args], {
    env: runEnv,
    encoding: "utf8",
    windowsHide: true,
    ...opts,
  });
}

function databaseExists(adminEnv, name) {
  const r = psqlRun(adminEnv, [
    "-tAc",
    `SELECT 1 FROM pg_database WHERE datname = '${name}'`,
  ]);
  return {
    ok: r.status === 0,
    exists: (r.stdout || "").trim() === "1",
    status: r.status,
    stderr: r.stderr || "",
  };
}
function endpointOf(e) {
  return `${e.PGUSER}@${e.PGHOST}:${e.PGPORT}`;
}
function ensureDatabaseExists(runEnv) {
  const target = runEnv.PGDATABASE;
  if (!target) fail("OPSQAI-E1901", { message: "PGDATABASE is not configured" });
  const adminEnv = { ...runEnv, PGDATABASE: "postgres" };
  const at = endpointOf(runEnv);

  const ping = psqlRun(adminEnv, ["-tAc", "SELECT 1"]);
  if (ping.status !== 0) {
    fail("OPSQAI-E1101", {
      endpoint: at,
      message: `cannot connect to system database "postgres": ${ping.stderr || "(no stderr)"}`,
    });
  }

  const first = databaseExists(adminEnv, target);
  if (!first.ok) {
    fail("OPSQAI-E1101", {
      endpoint: at,
      message: `pg_database lookup failed: ${first.stderr || "(no stderr)"}`,
    });
  }
  if (first.exists) {
    console.log(`[migrate] database "${target}" ready`);
    return;
  }

  console.log(`[migrate] creating database "${target}"`);
  const create = psqlRun(adminEnv, [
    "-c",
    `CREATE DATABASE "${target}" OWNER "${runEnv.PGUSER}" ENCODING 'UTF8' TEMPLATE template0`,
  ]);
  if (create.status !== 0) {
    const second = databaseExists(adminEnv, target);
    if (second.ok && second.exists) {
      console.log(`[migrate] database "${target}" ready`);
      return;
    }
    fail("OPSQAI-E1101", {
      endpoint: at,
      message: `CREATE DATABASE "${target}" failed: ${create.stderr || "(no stderr)"}`,
    });
  }
  console.log(`[migrate] database "${target}" ready`);
}
ensureDatabaseExists(env);

// ---------------------------------------------------------------------------
// Applied-migration tracking table.
// ---------------------------------------------------------------------------
const ensureTracking = psqlRun(env, [
  "-c",
  "CREATE TABLE IF NOT EXISTS public.schema_migrations (" +
    "  filename TEXT PRIMARY KEY," +
    "  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()" +
    ")",
]);
if (ensureTracking.status !== 0) {
  fail("OPSQAI-E1101", {
    message: `could not create schema_migrations: ${ensureTracking.stderr || "(no stderr)"}`,
  });
}

const appliedProbe = psqlRun(env, ["-tAc", "SELECT filename FROM public.schema_migrations"]);
if (appliedProbe.status !== 0) {
  fail("OPSQAI-E1101", {
    message: `could not read schema_migrations: ${appliedProbe.stderr || "(no stderr)"}`,
  });
}
const applied = new Set(
  (appliedProbe.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean),
);

const pending = files.filter((f) => !applied.has(f));

// -------------------------------------------------------------------------
// Parse psql stderr into (sqlstate, line, message). psql normally prints:
//   psql:0001_bootstrap.sql:61: ERROR:  type "citext" does not exist
//   LINE 3:   email          CITEXT ...
// With --set VERBOSITY=verbose we also get SQLSTATE.
// -------------------------------------------------------------------------
function parsePsqlError(stderr, filename) {
  const s = String(stderr || "");
  const out = { line: null, sqlstate: null, message: null };
  const errRe = new RegExp(
    "psql:[^:]*" +
      filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      ":(\\d+):\\s*ERROR:\\s*(.+)",
  );
  const m = errRe.exec(s);
  if (m) {
    out.line = Number(m[1]);
    out.message = m[2].trim();
  } else {
    const generic = /ERROR:\s*(.+)/.exec(s);
    if (generic) out.message = generic[1].trim();
  }
  const st = /SQLSTATE:\s*(\w+)/.exec(s) || /sqlstate\s+([0-9A-Z]{5})/i.exec(s);
  if (st) out.sqlstate = st[1];
  return out;
}

if (pending.length === 0) {
  console.log("[migrate] no pending migrations");
} else {
  console.log(`[migrate] applying ${pending.length} pending migration(s) from ${migrationsDir}`);
  for (const file of pending) {
    const full = join(migrationsDir, file);
    const migrationSha = fingerprints.get(file) || sha256File(full);
    console.log(`[migrate] ${file} sha256=${migrationSha}`);
    const result = spawnSync(
      psql,
      ["--set", "ON_ERROR_STOP=1", "--set", "VERBOSITY=verbose", "--file", full],
      { env, encoding: "utf8", windowsHide: true },
    );
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) {
      const parsed = parsePsqlError(result.stderr, file);
      // Map known packaging failures to stable, actionable codes.
      // 0A000 "extension \"vector\" is not available" means the pgvector
      // files were not staged into pgsql\lib and pgsql\share\extension by
      // the build. A Reset & Retry cannot fix this — the operator must
      // reinstall from a correctly built installer.
      const msg = parsed.message || "";
      const isPgvectorMissing =
        (parsed.sqlstate === "0A000" || /0A000/.test(msg)) &&
        /extension\s+"vector"\s+is not available/i.test(msg);
      const isStaleCloudMigration =
        (parsed.sqlstate === "42883" && /function\s+public\.set_updated_at\s*\(\)\s+does not exist/i.test(msg)) ||
        (parsed.sqlstate === "42P01" && /relation\s+"public\.companies"\s+does not exist/i.test(msg));
      const code = isPgvectorMissing ? "OPSQAI-E1010" : isStaleCloudMigration ? "OPSQAI-E1011" : "OPSQAI-E1001";
      fail(
        code,
        {
          file,
          line: parsed.line ?? "",
          sqlstate: parsed.sqlstate ?? "",
          migration_sha: migrationSha,
          message: parsed.message || `psql exit ${result.status}`,
        },
        result.status || 1,
      );
    }
    const record = psqlRun(env, [
      "-c",
      `INSERT INTO public.schema_migrations(filename) VALUES ('${file.replace(/'/g, "''")}')`,
    ]);
    if (record.status !== 0) {
      fail("OPSQAI-E1001", {
        file,
        message: `could not record applied migration: ${record.stderr || "(no stderr)"}`,
      });
    }
  }
}

// -------------------------------------------------------------------------
// Post-run health probes.
// -------------------------------------------------------------------------
const probe1 = psqlRun(env, ["-tAc", "SELECT count(*) FROM public.schema_migrations"]);
if (probe1.status !== 0) {
  fail("OPSQAI-E1002", {
    message: `schema_migrations probe failed: ${probe1.stderr || "(no stderr)"}`,
  });
}
const probe2 = psqlRun(env, ["-tAc", "SELECT to_regclass('public.users') IS NOT NULL"]);
if (probe2.status !== 0 || (probe2.stdout || "").trim() !== "t") {
  fail("OPSQAI-E1002", {
    message: `public.users not present after migrations`,
  });
}

console.log("[migrate] complete");
