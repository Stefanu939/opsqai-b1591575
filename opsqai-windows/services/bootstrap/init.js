// Bootstrap script run by the wizard after config is collected.
//   node bootstrap/init.js --admin-email ... --admin-password ... [--reset-embedded-db]
//
// Responsibilities:
//   1. Write %ProgramData%\OPSQAI\config\config.json atomically (owner-only ACL).
//   2. Open a per-install log at %ProgramData%\OPSQAI\logs\bootstrap-<ts>.log
//      and tee stdout/stderr into it.
//   3. Track state in public.installation_state (BOOTSTRAP-ONLY table).
//   4. Start OpsqaiDatabase, wait for TCP readiness.
//   5. Run app migrations. On failure emit a structured [bootstrap] FAIL line
//      the wizard renderer keys off.
//   6. Seed admin, trust Caddy CA, start remaining services, health-probe.
//
// With --reset-embedded-db (embedded mode only): stop OpsqaiDatabase, move
// the pgsql data dir aside as pgsql.failed-<ts>, prune old failed dirs
// (keep max 3 OR ≤ 14 days), then continue the normal bootstrap flow.

"use strict";
const fs = require("fs");
const path = require("path");
const net = require("net");
const https = require("https");
const crypto = require("crypto");
const { execFileSync, spawnSync } = require("child_process");
const { programData, programFiles, saveConfig } = require("../common/config");
const { formatFail, parseFail } = require("./errors.cjs");

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

// ─── Per-install log file ─────────────────────────────────────────────────
// Tees ALL stdout/stderr — including spawned migrate.mjs / admin-seed.mjs —
// into a single, timestamped file that the wizard's "Open Log" button opens.
const logStamp = new Date()
  .toISOString()
  .replace(/[-:T]/g, "")
  .replace(/\..+$/, "")
  .replace(/(\d{8})(\d{6})/, "$1-$2");
const logDir = programData("logs");
try {
  fs.mkdirSync(logDir, { recursive: true });
} catch (_) {}
const LOG_PATH = path.join(logDir, `bootstrap-${logStamp}.log`);
const logStream = fs.createWriteStream(LOG_PATH, { flags: "a" });
function teeWrite(chunk) {
  try {
    logStream.write(chunk);
  } catch (_) {}
}
{
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  process.stdout.write = (chunk, ...rest) => {
    teeWrite(chunk);
    return origOut(chunk, ...rest);
  };
  process.stderr.write = (chunk, ...rest) => {
    teeWrite(chunk);
    return origErr(chunk, ...rest);
  };
}
function log(m) {
  console.log(`[bootstrap] ${m}`);
}
log(`log: ${LOG_PATH}`);

const installId = arg("install-id", crypto.randomUUID());
const companyName = arg("company", "OPSQAI Customer");
const adminEmail = arg("admin-email");
const adminPassword = arg("admin-password");
const dbMode = arg("db-mode", "embedded");
const storageMode = arg("storage-mode", "local");
const licenseContents = arg("license", "");
const smtpJson = arg("smtp", "");
const startServices = arg("start-services", "true") !== "false";
const doResetEmbeddedDb = hasFlag("reset-embedded-db");

if (!adminEmail || !adminPassword) {
  console.error("Usage: init.js --admin-email <e> --admin-password <p> [--company <name>]");
  process.exit(2);
}

let licenseClaims = null;
if (licenseContents) {
  try {
    const parts = licenseContents.split(".");
    if (parts.length === 3) {
      licenseClaims = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
      );
    }
  } catch (e) {
    console.warn(`[bootstrap] cannot parse license claims: ${e.message}`);
  }
}

const smtpCfg = smtpJson ? JSON.parse(smtpJson) : null;

const config = {
  version: "1.0.0",
  installId,
  company: { name: companyName, contactEmail: adminEmail, timezone: "UTC" },
  database:
    dbMode === "embedded"
      ? { mode: "embedded", embedded: { port: 55432 } }
      : { mode: "external", external: JSON.parse(arg("db-external", "{}")) },
  storage:
    storageMode === "local"
      ? { mode: "local", local: { path: programData("data", "storage") } }
      : { mode: "s3", s3: JSON.parse(arg("storage-s3", "{}")) },
  ai: JSON.parse(arg("ai", '{"provider":"none"}')),
  smtp: smtpCfg,
  license: licenseClaims
    ? {
        edition: licenseClaims.edition ?? licenseClaims.tier ?? "community",
        seats: licenseClaims.seats ?? null,
        customer: licenseClaims.customer ?? licenseClaims.sub ?? null,
        exp: licenseClaims.exp ?? null,
        modules: Array.isArray(licenseClaims.modules) ? licenseClaims.modules : [],
      }
    : { edition: "community" },
  updates: {
    channel: "stable",
    manifestUrl: "https://updates.opsqai.de/channel/stable/manifest.json",
  },
};

fs.mkdirSync(programData("config"), { recursive: true });
fs.mkdirSync(programData("config", "keys"), { recursive: true });
fs.mkdirSync(programData("data", "storage"), { recursive: true });
fs.mkdirSync(programData("logs"), { recursive: true });
saveConfig(config);
log(`wrote config`);

if (licenseContents) {
  const licPath = path.join(programData("config"), "license.opsqai");
  try {
    fs.writeFileSync(licPath, licenseContents, { encoding: "utf8", mode: 0o600 });
    log(`wrote license file (${licenseContents.length} bytes)`);
    try {
      execFileSync(
        "icacls.exe",
        [licPath, "/inheritance:r", "/grant:r", "SYSTEM:F", "/grant:r", "BUILTIN\\Administrators:F"],
        { stdio: "ignore" },
      );
    } catch {}
  } catch (e) {
    console.warn(`[bootstrap] cannot write license: ${e.message}`);
  }
}

const jwtPriv = path.join(programData("config", "keys"), "jwt-signing.key");
const jwtPub = path.join(programData("config", "keys"), "jwt-signing.pub");
if (!fs.existsSync(jwtPriv) || !fs.existsSync(jwtPub)) {
  const { generateKeyPairSync } = require("crypto");
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  fs.writeFileSync(jwtPriv, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  fs.writeFileSync(jwtPub, publicKey.export({ type: "spki", format: "pem" }));
  log("generated Ed25519 JWT signing keypair");
  try {
    execFileSync(
      "icacls.exe",
      [jwtPriv, "/inheritance:r", "/grant:r", "SYSTEM:F", "/grant:r", "BUILTIN\\Administrators:F"],
      { stdio: "ignore" },
    );
  } catch {}
}

const bundledLicensePub = programFiles("payload", "updater", "pubkey.pem");
const configLicensePub = path.join(programData("config", "keys"), "license-verify.pub");
if (fs.existsSync(bundledLicensePub) && !fs.existsSync(configLicensePub)) {
  try {
    fs.copyFileSync(bundledLicensePub, configLicensePub);
    log("staged license verification public key");
  } catch (e) {
    console.warn(`[bootstrap] cannot stage license verify key: ${e.message}`);
  }
}

try {
  const cfgFile = path.join(programData("config"), "config.json");
  execFileSync(
    "icacls.exe",
    [cfgFile, "/inheritance:r", "/grant:r", "SYSTEM:F", "/grant:r", "BUILTIN\\Administrators:F"],
    { stdio: "inherit" },
  );
} catch (e) {
  console.warn(`[bootstrap] icacls on config failed: ${e.message}`);
}

// ─── Utilities ────────────────────────────────────────────────────────────
function svcCmd(name, action) {
  const svc = programFiles("winsw", `${name}.exe`);
  if (!fs.existsSync(svc)) {
    log(`skip ${action} ${name} (winsw wrapper not found)`);
    return 0;
  }
  const r = spawnSync(svc, [action], { stdio: "inherit" });
  return r.status ?? 0;
}
function waitTcp(host, port, ms) {
  const start = Date.now();
  return new Promise((resolve) => {
    (function attempt() {
      const s = net.connect(port, host);
      s.once("connect", () => {
        s.end();
        resolve(true);
      });
      s.once("error", () => {
        if (Date.now() - start > ms) return resolve(false);
        setTimeout(attempt, 1000);
      });
    })();
  });
}
function pgIsReady(port, timeoutMs) {
  const bin = programFiles("pgsql", "bin", "pg_isready.exe");
  if (!fs.existsSync(bin)) return { available: false };
  const deadline = Date.now() + timeoutMs;
  let last = { status: -1, out: "", err: "" };
  while (Date.now() < deadline) {
    const r = spawnSync(
      bin,
      ["-h", "127.0.0.1", "-p", String(port), "-U", "opsqai", "-d", "postgres", "-t", "3"],
      { encoding: "utf8" },
    );
    last = { status: r.status ?? -1, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
    if (last.status === 0) return { available: true, ready: true, ...last };
    spawnSync("cmd", ["/c", "ping", "127.0.0.1", "-n", "2", ">nul"]);
  }
  return { available: true, ready: false, ...last };
}
function tailFile(p, lines = 80) {
  try {
    if (!fs.existsSync(p)) return null;
    const txt = fs.readFileSync(p, "utf8").split(/\r?\n/);
    return txt.slice(-lines).join("\n");
  } catch (e) {
    return `(cannot read ${p}: ${e.message})`;
  }
}
function newestFile(dir, pattern) {
  try {
    if (!fs.existsSync(dir)) return null;
    const files = fs
      .readdirSync(dir)
      .filter((f) => pattern.test(f))
      .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    return files.length ? path.join(dir, files[0].f) : null;
  } catch {
    return null;
  }
}
function dumpDbDiagnostics() {
  console.error("[bootstrap] --- database diagnostics ---");
  const pgLog = newestFile(programData("data", "pgsql", "log"), /\.log$/i);
  if (pgLog) {
    console.error(`[bootstrap] postgres log: ${pgLog}`);
    console.error(tailFile(pgLog) ?? "(empty)");
  }
  for (const name of ["OpsqaiDatabase.out.log", "OpsqaiDatabase.err.log", "OpsqaiDatabase.wrapper.log"]) {
    const p = path.join(programData("logs"), name);
    const t = tailFile(p);
    if (t) {
      console.error(`[bootstrap] ${name}:`);
      console.error(t);
    }
  }
  console.error("[bootstrap] --- end diagnostics ---");
}
function httpsGet(url, ms = 30_000) {
  return new Promise((resolve) => {
    const req = https.get(url, { rejectUnauthorized: false, timeout: ms }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
  });
}

// ─── installation_state (bootstrap-only table) ────────────────────────────
function pgArgs() {
  const embedded = config.database.mode === "embedded";
  const port = embedded ? config.database.embedded.port : config.database.external.port;
  const host = embedded ? "127.0.0.1" : config.database.external.host;
  const user = embedded ? "opsqai" : config.database.external.username;
  const db = embedded ? "opsqai" : config.database.external.database;
  const pw = embedded ? "" : config.database.external.password;
  return { host, port, user, db, pw };
}
function psqlExec(sql) {
  const psql = programFiles("pgsql", "bin", "psql.exe");
  if (!fs.existsSync(psql)) return { status: -1 };
  const { host, port, user, db, pw } = pgArgs();
  try {
    // -w: never prompt for password (would block on a headless child).
    // timeout: hard cap so a misconfigured pg_hba can never stall bootstrap.
    return spawnSync(
      psql,
      ["-w", "-v", "ON_ERROR_STOP=1", "-h", host, "-p", String(port), "-U", user, "-d", db, "-c", sql],
      {
        env: { ...process.env, PGPASSWORD: pw || process.env.PGPASSWORD || "" },
        encoding: "utf8",
        windowsHide: true,
        timeout: 10_000,
        killSignal: "SIGKILL",
      },
    );
  } catch (e) {
    return { status: -1, error: e.message };
  }
}
function writeInstallState(state, stage, lastError) {
  // Best-effort: if the DB is unreachable (embedded not up yet, or app db
  // does not exist before migrations) we silently skip. State is a
  // debugging aid, not a correctness gate — NEVER let it stall bootstrap.
  try {
    const detail = lastError
      ? { ...lastError, log_path: LOG_PATH }
      : { log_path: LOG_PATH };
    const json = JSON.stringify(detail).replace(/'/g, "''");
    const sql =
      `INSERT INTO public.installation_state(singleton, state, stage, last_error, updated_at) ` +
      `VALUES (TRUE, '${state}', ${stage ? `'${stage}'` : "NULL"}, '${json}'::jsonb, now()) ` +
      `ON CONFLICT (singleton) DO UPDATE SET state = EXCLUDED.state, stage = EXCLUDED.stage, ` +
      `last_error = EXCLUDED.last_error, updated_at = now()`;
    psqlExec(sql);
  } catch (e) {
    console.warn(`[bootstrap] writeInstallState skipped: ${e.message}`);
  }
}


// ─── Reset embedded database (destructive, embedded only) ─────────────────
function resetEmbeddedDatabase() {
  if (config.database.mode !== "embedded") {
    log("refusing to reset: database.mode is not embedded");
    return false;
  }
  log("STAGE recovering (resetting embedded database)");
  svcCmd("OpsqaiDatabase", "stop");
  // Give the service a moment to release file handles on Windows.
  spawnSync("cmd", ["/c", "ping", "127.0.0.1", "-n", "3", ">nul"]);

  const dataDir = programData("data", "pgsql");
  if (fs.existsSync(dataDir)) {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .replace(/\..+$/, "")
      .replace(/(\d{8})(\d{6})/, "$1-$2");
    const failedDir = programData("data", `pgsql.failed-${stamp}`);
    try {
      fs.renameSync(dataDir, failedDir);
      log(`moved data dir to ${failedDir}`);
    } catch (e) {
      console.error(`[bootstrap] cannot move data dir: ${e.message}`);
      return false;
    }
  }

  // Prune old failed backups: keep at most 3 most recent, and drop any > 14 days.
  try {
    const dataRoot = programData("data");
    const entries = fs
      .readdirSync(dataRoot)
      .filter((f) => /^pgsql\.failed-/.test(f))
      .map((f) => {
        const full = path.join(dataRoot, f);
        let mtime = 0;
        try {
          mtime = fs.statSync(full).mtimeMs;
        } catch {}
        return { f, full, mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
    const cutoff = Date.now() - 14 * 24 * 3600 * 1000;
    const toDelete = entries.filter((e, idx) => idx >= 3 || e.mtime < cutoff);
    for (const e of toDelete) {
      try {
        fs.rmSync(e.full, { recursive: true, force: true });
        log(`pruned old failed backup ${e.f}`);
      } catch (err) {
        console.warn(`[bootstrap] could not prune ${e.f}: ${err.message}`);
      }
    }
  } catch (e) {
    console.warn(`[bootstrap] prune step failed: ${e.message}`);
  }

  return true;
}

// ─── Main flow ────────────────────────────────────────────────────────────
(async function main() {
  const stage = (name) => log(`STAGE ${name}`);
  stage("preparing installation");

  if (doResetEmbeddedDb) {
    const ok = resetEmbeddedDatabase();
    if (!ok) {
      console.log(formatFail("bootstrap", "OPSQAI-E1102", { message: "reset embedded database failed" }));
      process.exit(4);
    }
  }

  // --- 1. Start database ---
  if (dbMode === "embedded" && startServices) {
    stage("installing services (winsw)");
    log("starting OpsqaiDatabase (postgres)");
    svcCmd("OpsqaiDatabase", "start");

    const port = config.database.embedded.port;
    const tcpOk = await waitTcp("127.0.0.1", port, 120_000);
    if (!tcpOk) {
      dumpDbDiagnostics();
      console.log(
        formatFail("bootstrap", "OPSQAI-E1102", {
          message: `postgres TCP port ${port} not reachable after 120s`,
        }),
      );
      process.exit(3);
    }
    log(`postgres TCP port ${port} open — running pg_isready`);

    const probe = pgIsReady(port, 30_000);
    if (probe.available && !probe.ready) {
      dumpDbDiagnostics();
      console.log(
        formatFail("bootstrap", "OPSQAI-E1102", {
          message: `pg_isready never returned 0 (last status=${probe.status}, err='${probe.err}')`,
        }),
      );
      process.exit(3);
    }
    log(`postgres ready on 127.0.0.1:${port}${probe.available ? ` (${probe.out || "pg_isready ok"})` : " (pg_isready.exe missing; TCP-only)"}`);
  }

  // NOTE: do NOT write installation_state here — on a fresh install the
  // `opsqai` database and role do not exist until the migrator creates
  // them. Emit a STAGE marker (wizard progress) and defer the DB write
  // until after the migrator succeeds.

  // --- 2. Run app migrations ---
  console.log("[bootstrap] locating migrate.mjs");
  const migratorDir = programFiles("app", "server");
  const migrator = path.join(migratorDir, "migrate.mjs");
  console.log("[bootstrap] migrator =", migrator);
  console.log("[bootstrap] exists   =", fs.existsSync(migrator));

  // Pre-flight: fail fast with a stable code (E1902) if any required
  // packaged bootstrap file is missing, instead of letting Node crash
  // with an unstructured MODULE_NOT_FOUND stack trace.
  const requiredMigratorFiles = ["migrate.mjs", "errors.cjs"];
  const missingFiles = requiredMigratorFiles.filter(
    (f) => !fs.existsSync(path.join(migratorDir, f)),
  );
  if (fs.existsSync(migrator) && missingFiles.length > 0) {
    console.log(
      formatFail("bootstrap", "OPSQAI-E1902", {
        dir: migratorDir,
        message: `Installer payload incomplete. Missing: ${missingFiles.join(", ")}`,
        log_path: LOG_PATH,
      }),
    );
    process.exit(5);
  }

  if (fs.existsSync(migrator)) {
    console.log("[bootstrap] before stage(running app migrations)");
    stage("running app migrations");
    console.log("[bootstrap] launching migrate.mjs");
    const child = spawnSync(programFiles("runtime", "node", "node.exe"), [migrator], {
      encoding: "utf8",
      env: {
        ...process.env,
        OPSQAI_ADMIN_EMAIL: adminEmail,
        OPSQAI_ADMIN_PASSWORD: adminPassword,
        OPSQAI_CONFIG: path.join(programData("config"), "config.json"),
      },
      windowsHide: true,
      timeout: 300_000,
      killSignal: "SIGKILL",
    });
    console.log("[bootstrap] migrate.mjs exited status =", child.status);
    if (child.stdout) process.stdout.write(child.stdout);
    if (child.stderr) process.stderr.write(child.stderr);
    if (child.status !== 0) {
      // Try to extract the structured FAIL line the migrator prints.
      const lines = String(child.stdout || "").split(/\r?\n/);
      let fail = null;
      for (const l of lines) {
        const p = parseFail(l);
        if (p && p.component === "migrate") fail = p;
      }
      const errFields = fail
        ? {
            code: fail.code,
            file: fail.file,
            line: fail.line,
            sqlstate: fail.sqlstate,
            migration_sha: fail.migration_sha,
            expected_sha: fail.expected_sha,
            message: fail.message,
          }
        : {
            code: "OPSQAI-E1001",
            message:
              child.error && child.error.code === "ETIMEDOUT"
                ? "migrator timed out after 300s"
                : `migrator exited with code ${child.status}`,
          };
      writeInstallState("failed", "migrate", errFields);
      // Re-emit at bootstrap level so wizard renders the failure card.
      console.log(
        formatFail("bootstrap", errFields.code || "OPSQAI-E1001", {
          file: errFields.file,
          line: errFields.line,
          sqlstate: errFields.sqlstate,
          migration_sha: errFields.migration_sha,
          expected_sha: errFields.expected_sha,
          message: errFields.message,

          log_path: LOG_PATH,
        }),
      );
      process.exit(4);
    }
  } else {
    log(`app migrator not present at ${migrator} — skipping (Phase 2 skeleton)`);
  }

  writeInstallState("bootstrapping", "seed", null);

  // --- 2b. Seed initial admin ---
  const seeder = programFiles("app", "server", "admin-seed.mjs");
  if (fs.existsSync(seeder)) {
    log("seeding admin account");
    try {
      execFileSync(programFiles("runtime", "node", "node.exe"), [seeder], {
        stdio: "inherit",
        env: {
          ...process.env,
          OPSQAI_ADMIN_EMAIL: adminEmail,
          OPSQAI_ADMIN_PASSWORD: adminPassword,
          OPSQAI_CONFIG: path.join(programData("config"), "config.json"),
        },
      });
      log("admin seeded");
    } catch (e) {
      const errFields = { code: "OPSQAI-E1201", message: e.message };
      writeInstallState("failed", "seed", errFields);
      console.log(formatFail("bootstrap", errFields.code, { message: errFields.message, log_path: LOG_PATH }));
      process.exit(6);
    }
  } else {
    log(`admin seeder not present at ${seeder} — skipping`);
  }

  writeInstallState("bootstrapping", "services", null);

  // --- 3. Caddy + trust CA ---
  if (startServices) {
    stage("ai engine (skipped: configure post-install)");
    stage("knowledge base storage ready");
    stage("finalizing");
    log("starting OpsqaiCaddy");
    svcCmd("OpsqaiCaddy", "start");
    const rootCert = programData("certs", "pki", "authorities", "local", "root.crt");
    for (let i = 0; i < 30 && !fs.existsSync(rootCert); i++) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (fs.existsSync(rootCert)) {
      try {
        execFileSync("certutil.exe", ["-addstore", "-f", "Root", rootCert], { stdio: "inherit" });
        log("Caddy root CA trusted in LocalMachine\\Root");
      } catch (e) {
        console.warn(`[bootstrap] failed to trust Caddy root: ${e.message}`);
      }
    }
  }

  // --- 4. Platform + worker + updater ---
  if (startServices) {
    log("starting OpsqaiPlatform");
    svcCmd("OpsqaiPlatform", "start");
    svcCmd("OpsqaiWorker", "start");
    svcCmd("OpsqaiUpdater", "start");

    log("probing https://localhost/health");
    let ok = false;
    for (let i = 0; i < 30; i++) {
      const r = await httpsGet("https://localhost/health", 5000);
      if (r.status && r.status >= 200 && r.status < 500) {
        log(`health OK (HTTP ${r.status}) after ${i + 1}s`);
        ok = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!ok) {
      const errFields = { code: "OPSQAI-E1301", message: "health probe failed after service start" };
      writeInstallState("failed", "services", errFields);
      console.log(formatFail("bootstrap", errFields.code, { message: errFields.message, log_path: LOG_PATH }));
      process.exit(5);
    }
  }

  // --- 5. Register daily backup ---
  try {
    const scheduled = programFiles("services", "backup", "scheduled.js");
    const node = programFiles("runtime", "node", "node.exe");
    if (fs.existsSync(scheduled) && fs.existsSync(node)) {
      log("registering scheduled task OPSQAI\\DailyBackup (02:15 daily)");
      execFileSync(
        "schtasks.exe",
        [
          "/Create",
          "/F",
          "/SC",
          "DAILY",
          "/ST",
          "02:15",
          "/RL",
          "HIGHEST",
          "/RU",
          "SYSTEM",
          "/TN",
          "OPSQAI\\DailyBackup",
          "/TR",
          `"${node}" "${scheduled}"`,
        ],
        { stdio: "inherit" },
      );
    }
  } catch (e) {
    console.warn(`[bootstrap] schtasks register failed (non-fatal): ${e.message}`);
  }

  writeInstallState("complete", "ready", null);
  log(`log: ${LOG_PATH}`);
  log("done");
})().catch((e) => {
  console.error(`[bootstrap] fatal: ${e.stack || e.message}`);
  try {
    writeInstallState("failed", null, { code: "OPSQAI-E1901", message: e.message });
  } catch {}
  console.log(formatFail("bootstrap", "OPSQAI-E1901", { message: e.message, log_path: LOG_PATH }));
  process.exit(99);
});
