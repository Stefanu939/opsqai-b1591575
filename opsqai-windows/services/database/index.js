// OpsqaiDatabase — supervisor for the embedded PostgreSQL Portable binary.
// Only registered when config.database.mode === 'embedded'.
//
// Phase 2 hardening:
//   - initdb with --auth-local=scram-sha-256 --auth-host=scram-sha-256
//   - superuser password provisioned via --pwfile (never on argv)
//   - password persisted to config.json (owner-only ACL applied by bootstrap)
//   - listen on 127.0.0.1 only; pg_hba locked to loopback + scram
//   - clean shutdown via pg_ctl stop -m fast on SIGTERM
//
// Phase 2.1 fix:
//   - postgresql.conf / pg_hba.conf writes are IDEMPOTENT (repaired on every
//     boot). A partially-initialized data dir left behind by an aborted
//     install used to leave postgres listening on default port 5432, so
//     bootstrap's readiness probe on 55432 timed out with no explanation.
//   - readiness now uses pg_isready in addition to a raw TCP connect and
//     will wait up to 90s. Exit code + stderr of the postgres child are
//     surfaced loudly so bootstrap's log tail is actionable.

"use strict";
const { spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { loadConfig, saveConfig, programData, programFiles } = require("../common/config");
const { ensureConfig } = require("./ensure-config");

const cfg = loadConfig();
if (cfg.database.mode !== "embedded") {
  console.log("[db] External DB mode — this service should not have been registered. Exiting.");
  process.exit(0);
}

const port = cfg.database.embedded.port || 55432;
const pgBin = programFiles("pgsql", "bin");
const dataDir = programData("data", "pgsql");
const pgCtl = path.join(pgBin, "pg_ctl.exe");
const pgIsReady = path.join(pgBin, "pg_isready.exe");
const initdb = path.join(pgBin, "initdb.exe");
// postgres.exe is not spawned directly — pg_ctl start does it under a
// restricted (non-admin) token, which is required on Windows services.

function log(m) {
  console.log(`[${new Date().toISOString()}] [db] ${m}`);
}

function ensurePassword() {
  if (cfg.database.embedded.password && cfg.database.embedded.password.length >= 24) {
    return cfg.database.embedded.password;
  }
  const pw = crypto.randomBytes(24).toString("base64url");
  cfg.database.embedded.password = pw;
  saveConfig(cfg);
  log("generated new embedded postgres password");
  return pw;
}

const freshInit = !fs.existsSync(path.join(dataDir, "PG_VERSION"));

if (freshInit) {
  const pw = ensurePassword();
  fs.mkdirSync(dataDir, { recursive: true });
  const pwFile = path.join(os.tmpdir(), `opsqai-pg-${process.pid}.pw`);
  fs.writeFileSync(pwFile, pw, { mode: 0o600 });
  try {
    log(`initdb -> ${dataDir}`);
    const r = spawnSync(
      initdb,
      [
        "-D",
        dataDir,
        "-U",
        "opsqai",
        "--auth-local=scram-sha-256",
        "--auth-host=scram-sha-256",
        `--pwfile=${pwFile}`,
        "-E",
        "UTF8",
      ],
      { stdio: "inherit" },
    );
    if (r.status !== 0) {
      log(`initdb failed: ${r.status}`);
      process.exit(1);
    }
  } finally {
    try {
      fs.unlinkSync(pwFile);
    } catch {}
  }
} else {
  // Ensure password is known even on re-registration.
  ensurePassword();
  log("existing data dir detected — verifying config is up to date");
}

// IDEMPOTENT: always repair postgresql.conf / pg_hba.conf. This fixes stale
// data dirs left behind by an aborted install (where PG_VERSION exists but
// the OPSQAI config block was never appended).
try {
  const result = ensureConfig(dataDir, port);
  if (result.postgresqlConfChanged) log(`postgresql.conf: ${result.postgresqlConfAction}`);
  if (result.pgHbaChanged) log(`pg_hba.conf: rewritten (loopback + scram-sha-256 only)`);
} catch (e) {
  log(`FATAL: ensureConfig failed: ${e.message}`);
  process.exit(1);
}

const logDir = path.join(dataDir, "log");
fs.mkdirSync(logDir, { recursive: true });
const pgLogFile = path.join(logDir, "postgres.log");

// IMPORTANT: On Windows, postgres.exe refuses to run under an account with
// administrative privileges (WinSW runs services as LocalSystem by default).
// pg_ctl detects this case and spawns postgres via CreateRestrictedToken,
// dropping admin rights before exec. So we MUST use `pg_ctl start` rather
// than spawning postgres.exe directly — otherwise every start fails with:
//   "Execution of PostgreSQL by a user with administrative permissions is
//    not permitted."
log(`Starting postgres on 127.0.0.1:${port} via pg_ctl (restricted token)`);
const startRes = spawnSync(
  pgCtl,
  ["-D", dataDir, "-l", pgLogFile, "-w", "-t", "60", "start"],
  { stdio: "inherit" },
);
if (startRes.status !== 0) {
  log(`FATAL: pg_ctl start exited with code ${startRes.status}. See ${pgLogFile}`);
  process.exit(1);
}
log("pg_ctl reported postgres started; entering watchdog loop.");

async function readinessProbe() {
  const deadline = Date.now() + 90_000;
  let lastMsg = "";
  let tcpOk = false;
  while (Date.now() < deadline) {
    if (!tcpOk) {
      tcpOk = await new Promise((resolve) => {
        const s = net.connect(port, "127.0.0.1");
        s.once("connect", () => {
          s.end();
          resolve(true);
        });
        s.once("error", () => resolve(false));
      });
    }
    if (tcpOk && fs.existsSync(pgIsReady)) {
      const r = spawnSync(pgIsReady, ["-h", "127.0.0.1", "-p", String(port), "-U", "opsqai", "-d", "postgres"], {
        encoding: "utf8",
      });
      lastMsg = `${(r.stdout || "").trim()} ${(r.stderr || "").trim()}`.trim();
      if (r.status === 0) {
        log(`Postgres is accepting connections (pg_isready: ${lastMsg || "ok"}).`);
        return;
      }
    } else if (tcpOk) {
      log("Postgres TCP socket open (pg_isready.exe not present; accepting).");
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  log(`Postgres did not become ready in 90s. tcpOk=${tcpOk} lastProbe='${lastMsg}'`);
  log(`Check ${logDir}\\ for postgres startup errors.`);
}

setTimeout(() => {
  readinessProbe().catch((e) => log(`readiness probe error: ${e.message}`));
}, 500);

let stopping = false;
function stopPostgres(reason) {
  if (stopping) return;
  stopping = true;
  log(`stopping postgres (${reason})`);
  spawnSync(pgCtl, ["-D", dataDir, "stop", "-m", "fast", "-w", "-t", "30"], { stdio: "inherit" });
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  process.on(sig, () => {
    stopPostgres(sig);
    process.exit(0);
  });
}
process.on("exit", () => stopPostgres("node exit"));

// Watchdog: pg_ctl start returned but postgres runs detached. Poll pg_isready
// so WinSW sees this node process fail if postgres dies unexpectedly.
setInterval(() => {
  if (stopping) return;
  if (!fs.existsSync(pgIsReady)) return;
  const r = spawnSync(pgIsReady, ["-h", "127.0.0.1", "-p", String(port), "-U", "opsqai", "-d", "postgres"], {
    encoding: "utf8",
  });
  if (r.status !== 0) {
    log(`watchdog: pg_isready failed (status=${r.status}): ${(r.stderr || "").trim()}`);
    // Exit non-zero so WinSW restarts the service. pg_ctl start is idempotent
    // when postgres is already up.
    process.exit(1);
  }
}, 10_000).unref();
