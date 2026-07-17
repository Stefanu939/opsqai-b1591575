// OPSQAI Windows migration runner.
// Runs inside the installed Windows payload with bundled Node and psql.exe.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const installRoot = resolve(here, "..", "..");
const programData = process.env.ProgramData || "C:\\ProgramData";
const configPath =
  process.env.OPSQAI_CONFIG || join(programData, "OPSQAI", "config", "config.json");
const migrationsDir = join(installRoot, "app", "migrations");
const psql = join(installRoot, "pgsql", "bin", "psql.exe");

function fail(message, code = 1) {
  console.error(`[migrate] ${message}`);
  process.exit(code);
}

if (!existsSync(configPath)) fail(`config not found at ${configPath}`);
if (!existsSync(migrationsDir)) fail(`migrations not found at ${migrationsDir}`);
if (!existsSync(psql)) fail(`psql.exe not found at ${psql}`);

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

if (files.length === 0) {
  console.log("[migrate] no SQL migrations bundled");
  process.exit(0);
}

const env = { ...process.env, ...databaseEnv(), ON_ERROR_STOP: "1" };

// Embedded PostgreSQL initializes only the cluster and the "postgres"
// database. The application database is created lazily here before
// running migrations. Safe to execute on every bootstrap.

function psqlRun(runEnv, args, opts = {}) {
  return spawnSync(psql, ["-v", "ON_ERROR_STOP=1", ...args], {
    env: runEnv,
    encoding: "utf8",
    windowsHide: true,
    ...opts,
  });
}

// Pur, fără throw. Erorile sunt raportate prin obiect-rezultat;
// decizia (fail vs. continue) stă în caller.
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

  // (0) Validează configurarea — fără asta CREATE DATABASE "" ar trece
  //     de checks și ar produce un diagnostic complet neutil.
  if (!target) {
    fail("PGDATABASE is not configured", 1);
  }

  const adminEnv = { ...runEnv, PGDATABASE: "postgres" };
  const at = endpointOf(runEnv);

  // (1) Sanity check pe DB-ul de sistem.
  const ping = psqlRun(adminEnv, ["-tAc", "SELECT 1"]);
  if (ping.status !== 0) {
    fail(
      `cannot connect to system database "postgres" as ${at}: ${ping.stderr || "(no stderr)"}`,
      ping.status || 1,
    );
  }

  // (2) Check.
  const first = databaseExists(adminEnv, target);
  if (!first.ok) {
    fail(
      `pg_database lookup for "${target}" failed on ${at} (exit ${first.status}): ${first.stderr || "(no stderr)"}`,
      first.status || 1,
    );
  }
  if (first.exists) {
    console.log(`[migrate] database "${target}" ready`);
    return;
  }

  // (3) CREATE. Identificatori via format('%I') pe server.
  console.log(`[migrate] creating database "${target}"`);
  const create = psqlRun(adminEnv, [
    "-c",
    `CREATE DATABASE "${target}" OWNER "${runEnv.PGUSER}" ENCODING 'UTF8' TEMPLATE template0`,
  ]);

  // (4) Race-safe re-check. Menținem SELECT / CREATE / SELECT tocmai
  //     pentru a NU depinde de textul mesajului sau de SQLSTATE.
  if (create.status !== 0) {
    const second = databaseExists(adminEnv, target);

    // Dublă eroare: CREATE a picat ȘI nu putem verifica starea reală.
    if (!second.ok) {
      fail(
        `CREATE DATABASE "${target}" failed on ${at} and existence could not be re-verified. ` +
          `CREATE (exit ${create.status}): ${create.stderr || "(no stderr)"} | ` +
          `re-check (exit ${second.status}): ${second.stderr || "(no stderr)"}`,
        second.status || create.status || 1,
      );
    }

    if (second.exists) {
      // Race câștigat de alt bootstrap. Rezultatul final e același: baza e gata.
      console.log(`[migrate] database "${target}" ready`);
      return;
    }

    fail(
      `CREATE DATABASE "${target}" failed while connected to "postgres" as ${at} (exit ${create.status}): ${create.stderr || "(no stderr)"}`,
      create.status || 1,
    );
  }

  console.log(`[migrate] database "${target}" ready`);
}

ensureDatabaseExists(env);

// ---------------------------------------------------------------------------
// Applied-migration tracking. `public.schema_migrations` records each file
// that has already run so re-invoking the bootstrap (updates, repairs) does
// not re-apply migrations. The table itself is created idempotently before
// the migration loop.
// ---------------------------------------------------------------------------
const ensureTracking = spawnSync(
  psql,
  [
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "CREATE TABLE IF NOT EXISTS public.schema_migrations (" +
      "  filename TEXT PRIMARY KEY," +
      "  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()" +
      ")",
  ],
  { env, encoding: "utf8", windowsHide: true },
);
if (ensureTracking.status !== 0) {
  fail(
    `could not create schema_migrations table: ${ensureTracking.stderr || "(no stderr)"}`,
    ensureTracking.status || 1,
  );
}

const appliedProbe = spawnSync(
  psql,
  ["-tAc", "SELECT filename FROM public.schema_migrations"],
  { env, encoding: "utf8", windowsHide: true },
);
if (appliedProbe.status !== 0) {
  fail(`could not read schema_migrations: ${appliedProbe.stderr || "(no stderr)"}`, appliedProbe.status || 1);
}
const applied = new Set(
  (appliedProbe.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean),
);

const pending = files.filter((f) => !applied.has(f));
if (pending.length === 0) {
  console.log("[migrate] no pending migrations");
  process.exit(0);
}

console.log(`[migrate] applying ${pending.length} pending migration(s) from ${migrationsDir}`);
for (const file of pending) {
  const full = join(migrationsDir, file);
  console.log(`[migrate] ${file}`);
  const result = spawnSync(psql, ["--set", "ON_ERROR_STOP=1", "--file", full], {
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0)
    fail(`${file} failed with exit code ${result.status}`, result.status || 1);

  const record = spawnSync(
    psql,
    [
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `INSERT INTO public.schema_migrations(filename) VALUES ('${file.replace(/'/g, "''")}')`,
    ],
    { env, encoding: "utf8", windowsHide: true },
  );
  if (record.status !== 0) {
    fail(
      `could not record applied migration ${file}: ${record.stderr || "(no stderr)"}`,
      record.status || 1,
    );
  }
}

console.log("[migrate] complete");
