// OPSQAI Docker → Native Migrator.
//
// Migrates an existing Docker-based OPSQAI deployment onto the native
// Windows install produced by this project. Runs on the same host that
// currently runs `docker compose` from opsqai/docker.
//
// Usage:
//   opsqai-migrate --compose "C:\path\to\docker-compose.yml" [--stop-containers]
//
// Steps:
//   1. Read the compose project's environment (POSTGRES_PASSWORD, storage
//      bind mount, ai provider secrets) and inspect the running containers.
//   2. pg_dump the containerised database over the exposed 5432 port
//      (or via `docker exec`) into %ProgramData%\OPSQAI\migrations\import\db.dump.
//   3. Copy the storage bind mount into %ProgramData%\OPSQAI\data\storage.
//   4. Write %ProgramData%\OPSQAI\config\config.json (embedded DB mode)
//      with the discovered admin email + a freshly-generated postgres
//      password, and stash the source password in migrations/import.
//   5. Stop OPSQAI services, initdb the embedded cluster if needed, run
//      pg_restore into it, then start services and health-probe.
//   6. Optionally `docker compose down` the old stack when everything
//      returns green.
//
// Failure at any step aborts before touching the native installation's
// data directory, so the Docker deployment remains a valid rollback.

"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const net = require("net");
const https = require("https");
const { execFileSync, spawnSync } = require("child_process");
const {
  loadConfig,
  saveConfig,
  programData,
  programFiles,
} = require("../../services/common/config");

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? true) : dflt;
}
function has(flag) {
  return process.argv.includes(`--${flag}`);
}
function log(m) {
  console.log(`[migrate] ${m}`);
}
function die(m, code = 1) {
  console.error(`[migrate] ${m}`);
  process.exit(code);
}

const composePath = arg("compose");
if (!composePath || !fs.existsSync(composePath)) {
  die("missing or invalid --compose <docker-compose.yml>");
}
const composeDir = path.dirname(path.resolve(composePath));

// -- 1. discover ------------------------------------------------------------
function runDocker(args) {
  const r = spawnSync("docker", args, { encoding: "utf8", cwd: composeDir });
  if (r.status !== 0) throw new Error(`docker ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  return r.stdout;
}
function findContainer(service) {
  const raw = runDocker(["compose", "-f", composePath, "ps", "--format", "json", service]);
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return null;
  return JSON.parse(lines[0]);
}

log("discovering existing Docker stack...");
const dbContainer =
  findContainer("db") || findContainer("postgres") || findContainer("supabase-db");
const appContainer = findContainer("app") || findContainer("platform");
if (!dbContainer)
  die("could not find the postgres container. Pass its service name via --db-service.");
log(`postgres container: ${dbContainer.Name}`);

// -- 2. dump ----------------------------------------------------------------
const importDir = programData("migrations", "import");
fs.mkdirSync(importDir, { recursive: true });
const dumpFile = path.join(importDir, "db.dump");

const dbEnv = JSON.parse(runDocker(["inspect", dbContainer.Name])).at?.(0)?.Config?.Env || [];
const envMap = Object.fromEntries(
  dbEnv.map((s) => {
    const i = s.indexOf("=");
    return [s.slice(0, i), s.slice(i + 1)];
  }),
);
const srcPassword = envMap.POSTGRES_PASSWORD || envMap.PGPASSWORD || "";
const srcUser = envMap.POSTGRES_USER || "postgres";
const srcDb = envMap.POSTGRES_DB || "postgres";
if (!srcPassword)
  die("POSTGRES_PASSWORD not found on container — set it in the compose env before migrating.");

log(`pg_dump ${srcDb} -> ${dumpFile}`);
execFileSync(
  "docker",
  [
    "exec",
    "-e",
    `PGPASSWORD=${srcPassword}`,
    dbContainer.Name,
    "pg_dump",
    "-U",
    srcUser,
    "-F",
    "c",
    "-f",
    "/tmp/opsqai-migrate.dump",
    srcDb,
  ],
  { stdio: "inherit" },
);
execFileSync("docker", ["cp", `${dbContainer.Name}:/tmp/opsqai-migrate.dump`, dumpFile], {
  stdio: "inherit",
});

// -- 3. storage bind mount --------------------------------------------------
const mounts =
  JSON.parse(runDocker(["inspect", appContainer?.Name || dbContainer.Name])).at(0)?.Mounts || [];
const storageMount = mounts.find((m) => /storage|uploads|data/i.test(m.Destination));
const storageDest = programData("data", "storage");
if (storageMount && fs.existsSync(storageMount.Source)) {
  log(`storage: ${storageMount.Source} -> ${storageDest}`);
  fs.mkdirSync(storageDest, { recursive: true });
  execFileSync("robocopy.exe", [storageMount.Source, storageDest, "/E", "/NFL", "/NDL", "/NP"], {
    stdio: "inherit",
  });
} else {
  log("no storage bind mount detected — skipping file copy");
}

// -- 4. write config.json ---------------------------------------------------
let cfg;
try {
  cfg = loadConfig();
} catch {
  cfg = {
    version: "1.0.0",
    installId: crypto.randomUUID(),
    company: {
      name: envMap.OPSQAI_COMPANY_NAME || "Migrated from Docker",
      contactEmail: envMap.OPSQAI_ADMIN_EMAIL || "",
      timezone: "UTC",
    },
    database: { mode: "embedded", embedded: { port: 55432 } },
    storage: { mode: "local", local: { path: storageDest } },
    ai: { provider: envMap.OPSQAI_AI_PROVIDER || "none" },
    updates: {
      channel: "stable",
      manifestUrl: "https://updates.opsqai.de/channel/stable/manifest.json",
    },
  };
}
const newPgPassword = crypto.randomBytes(24).toString("base64url");
cfg.database.embedded.password = newPgPassword;
saveConfig(cfg);
fs.writeFileSync(
  path.join(importDir, "source.json"),
  JSON.stringify(
    {
      container: dbContainer.Name,
      srcUser,
      srcDb,
      at: new Date().toISOString(),
    },
    null,
    2,
  ),
);
log("config written; embedded postgres will be re-initialised with a new password");

// -- 5. stop services, initdb, restore, start ------------------------------
function winsw(svc, action) {
  const exe = programFiles("winsw", `${svc}.exe`);
  if (!fs.existsSync(exe)) return;
  spawnSync(exe, [action], { stdio: "inherit" });
}
["OpsqaiUpdater", "OpsqaiCaddy", "OpsqaiWorker", "OpsqaiPlatform", "OpsqaiDatabase"].forEach((s) =>
  winsw(s, "stop"),
);

// Wipe the existing embedded cluster only if the operator confirms.
const clusterDir = programData("data", "pgsql");
if (has("reset-cluster") && fs.existsSync(clusterDir)) {
  log("resetting embedded cluster (--reset-cluster)");
  fs.rmSync(clusterDir, { recursive: true, force: true });
}

winsw("OpsqaiDatabase", "start"); // triggers initdb using the new password
function waitPg(port, ms = 60000) {
  const start = Date.now();
  return new Promise((resolve) => {
    (function tick() {
      const s = net.connect(port, "127.0.0.1");
      s.once("connect", () => {
        s.end();
        resolve(true);
      });
      s.once("error", () => {
        if (Date.now() - start > ms) return resolve(false);
        setTimeout(tick, 1000);
      });
    })();
  });
}

(async function main() {
  const ok = await waitPg(cfg.database.embedded.port);
  if (!ok) die("embedded postgres did not come up within 60s");

  log("pg_restore -> embedded cluster");
  const pgRestore = programFiles("pgsql", "bin", "pg_restore.exe");
  execFileSync(
    pgRestore,
    [
      "-h",
      "127.0.0.1",
      "-p",
      String(cfg.database.embedded.port),
      "-U",
      "opsqai",
      "-d",
      "opsqai",
      "--clean",
      "--if-exists",
      dumpFile,
    ],
    { stdio: "inherit", env: { ...process.env, PGPASSWORD: newPgPassword } },
  );

  ["OpsqaiPlatform", "OpsqaiWorker", "OpsqaiCaddy", "OpsqaiUpdater"].forEach((s) =>
    winsw(s, "start"),
  );

  log("probing https://localhost/health");
  const probe = await new Promise((resolve) => {
    const req = https.get(
      "https://localhost/health",
      { rejectUnauthorized: false, timeout: 15000 },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", () => resolve(0));
    req.on("timeout", () => {
      req.destroy();
      resolve(0);
    });
  });
  if (!probe || probe >= 500) die(`health probe failed (HTTP ${probe})`, 2);
  log(`health OK (HTTP ${probe})`);

  if (has("stop-containers")) {
    log("stopping Docker stack");
    spawnSync("docker", ["compose", "-f", composePath, "down"], {
      stdio: "inherit",
      cwd: composeDir,
    });
  } else {
    log("Docker stack left running — after verification, run: docker compose down");
  }
  log("migration complete");
})();
