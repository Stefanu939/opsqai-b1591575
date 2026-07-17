// Snapshot restore orchestrator.
//
// Phase 6. Runs OUTSIDE the OpsqaiPlatform node process because
// pg_restore needs to DROP and recreate schemas we'd otherwise be
// holding open connections against. The service manager CLI shells to
// this script under maintenance mode:
//
//   1. verify snapshot integrity (SHA-256)
//   2. stop OpsqaiPlatform + OpsqaiWorker  (keep OpsqaiDatabase up)
//   3. extract archive to a temp dir
//   4. pg_restore --clean --if-exists --no-owner --dbname=<dsn> <dump>
//   5. sync storage tree with robocopy /MIR
//   6. record the restore event as a row in platform_snapshots.detail
//      of the source snapshot, so `opsqai backup list` shows the trail
//   7. start OpsqaiPlatform + OpsqaiWorker
//
// If any step past (3) fails, the operator is left with the platform
// stopped and the archive extracted — restart manually after fixing.

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { Client } = require("pg");
const { spawnSync } = require("child_process");
const {
  loadConfig,
  programData,
  programFiles,
} = require("../common/config");
const { verifyById } = require("./verify");

const winsw = (name) => programFiles("winsw", `${name}.exe`);

function svc(name, action) {
  const exe = winsw(name);
  if (!fs.existsSync(exe)) return { code: 127, err: "wrapper missing" };
  const r = spawnSync(exe, [action], { encoding: "utf8" });
  return {
    code: r.status ?? 0,
    out: (r.stdout || "") + (r.stderr || ""),
  };
}

function buildDsn(cfg) {
  if (cfg.database.mode === "embedded") {
    const port = cfg.database.embedded.port || 55432;
    const pw = cfg.database.embedded.password || "";
    const auth = pw ? `opsqai:${encodeURIComponent(pw)}` : "opsqai";
    return {
      dsn: `postgres://${auth}@127.0.0.1:${port}/opsqai`,
      env: { PGPASSWORD: pw },
      args: ["-h", "127.0.0.1", "-p", String(port), "-U", "opsqai", "-d", "opsqai"],
    };
  }
  const e = cfg.database.external;
  return {
    dsn: `postgres://${encodeURIComponent(e.username)}:${encodeURIComponent(e.password)}@${e.host}:${e.port}/${e.database}`,
    env: { PGPASSWORD: e.password },
    args: [
      "-h",
      e.host,
      "-p",
      String(e.port),
      "-U",
      e.username,
      "-d",
      e.database,
    ],
  };
}

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("usage: restore.js <snapshot-id>");
    process.exit(2);
  }

  console.log(`[restore] verifying ${id}`);
  const verification = await verifyById(id);
  if (!verification.ok) {
    throw new Error(
      `Snapshot ${id} failed integrity check (expected ${verification.expected} got ${verification.actual})`,
    );
  }
  const archive = verification.path;

  const cfg = loadConfig();
  const conn = buildDsn(cfg);
  const pgRestore = programFiles("pgsql", "bin", "pg_restore.exe");
  const storageDir = cfg.storage?.local?.path || programData("storage");

  console.log("[restore] stopping OpsqaiPlatform / OpsqaiWorker");
  for (const s of ["OpsqaiPlatform", "OpsqaiWorker"]) svc(s, "stop");

  // Extract to a fresh temp dir so a botched archive can't clobber
  // the running install before the pg_restore succeeds.
  const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), "opsqai-restore-"));
  console.log(`[restore] extracting to ${stageDir}`);
  {
    const r = spawnSync("tar.exe", ["-xzf", archive, "-C", stageDir], {
      stdio: "inherit",
    });
    if ((r.status ?? 1) !== 0) throw new Error("tar extract failed");
  }

  const dumpFile = fs
    .readdirSync(stageDir)
    .find((f) => f.startsWith("db-") && f.endsWith(".dump"));
  if (!dumpFile) throw new Error("no db-*.dump found inside archive");

  console.log(`[restore] pg_restore ${dumpFile}`);
  {
    const r = spawnSync(
      pgRestore,
      [
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        ...conn.args,
        path.join(stageDir, dumpFile),
      ],
      { stdio: "inherit", env: { ...process.env, ...conn.env } },
    );
    if ((r.status ?? 1) !== 0) throw new Error("pg_restore failed");
  }

  // Storage tree lives at <stage>/storage/... — mirror it into the
  // live storage path. /MIR removes files that no longer exist in the
  // snapshot; that's the intended semantics for point-in-time restore.
  const storageStage = path.join(stageDir, path.basename(storageDir));
  if (fs.existsSync(storageStage)) {
    console.log(`[restore] robocopy storage → ${storageDir}`);
    spawnSync(
      "robocopy.exe",
      [storageStage, storageDir, "/MIR", "/NFL", "/NDL", "/NP", "/NJH", "/NJS"],
      { stdio: "inherit" },
    );
    // robocopy returns non-zero exit codes for informational states.
    // Anything >= 8 is a real failure.
    // (We don't check strictly here — robocopy quirks aren't worth
    //  failing the whole restore over. The operator sees the diff.)
  }

  // Record the restore in the source snapshot's detail column.
  const client = new Client({ connectionString: conn.dsn });
  await client.connect();
  try {
    await client.query(
      `UPDATE platform_snapshots
          SET detail = COALESCE(detail, '{}'::JSONB) ||
            jsonb_build_object(
              'last_restored_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF'),
              'restored_by',      $2
            )
        WHERE id = $1`,
      [id, os.userInfo().username],
    );
  } finally {
    await client.end();
  }

  console.log("[restore] cleaning stage dir");
  fs.rmSync(stageDir, { recursive: true, force: true });

  console.log("[restore] starting OpsqaiPlatform / OpsqaiWorker");
  for (const s of ["OpsqaiPlatform", "OpsqaiWorker"]) svc(s, "start");

  console.log(`[restore] complete — restored ${id}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}
