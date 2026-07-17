// Backup: create a snapshot from the CLI (`opsqai backup create`).
//
// Phase 6. Standalone CommonJS process — does not touch the running
// OpsqaiPlatform. Writes archive to %ProgramData%\OPSQAI\backups\,
// records it in `platform_snapshots` with SHA-256 + tag + kind.
//
// Usage: node create.js <kind> [tag]

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { Client } = require("pg");
const { loadConfig, programData, programFiles } = require("../common/config");

function sha256File(p) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash("sha256");
    const s = fs.createReadStream(p);
    s.on("data", (c) => h.update(c));
    s.on("error", reject);
    s.on("end", () => resolve(h.digest("hex")));
  });
}

function buildDsn(cfg) {
  if (cfg.database.mode === "embedded") {
    const port = cfg.database.embedded.port || 55432;
    const pw = cfg.database.embedded.password || "";
    const auth = pw ? `opsqai:${encodeURIComponent(pw)}` : "opsqai";
    return {
      dsn: `postgres://${auth}@127.0.0.1:${port}/opsqai`,
      env: { PGPASSWORD: pw },
      dumpArgs: [
        "-h",
        "127.0.0.1",
        "-p",
        String(port),
        "-U",
        "opsqai",
        "-F",
        "c",
        "opsqai",
      ],
    };
  }
  const e = cfg.database.external;
  return {
    dsn: `postgres://${encodeURIComponent(e.username)}:${encodeURIComponent(e.password)}@${e.host}:${e.port}/${e.database}`,
    env: { PGPASSWORD: e.password },
    dumpArgs: [
      "-h",
      e.host,
      "-p",
      String(e.port),
      "-U",
      e.username,
      "-F",
      "c",
      e.database,
    ],
  };
}

async function main() {
  const kind = process.argv[2] || "manual";
  const tag = process.argv[3] || null;

  const cfg = loadConfig();
  const conn = buildDsn(cfg);
  const backupDir = programData("backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dumpFile = path.join(backupDir, `db-${stamp}.dump`);
  const archive = path.join(backupDir, `opsqai-${stamp}.tar.gz`);

  const pgDump = programFiles("pgsql", "bin", "pg_dump.exe");
  console.log(`[create] pg_dump → ${dumpFile}`);
  {
    const r = spawnSync(pgDump, [...conn.dumpArgs, "-f", dumpFile], {
      stdio: "inherit",
      env: { ...process.env, ...conn.env },
    });
    if ((r.status ?? 1) !== 0) throw new Error("pg_dump failed");
  }

  const storageDir = cfg.storage?.local?.path || programData("storage");
  const tarArgs = ["-czf", archive, "-C", backupDir, path.basename(dumpFile)];
  if (fs.existsSync(storageDir)) {
    tarArgs.push("-C", path.dirname(storageDir), path.basename(storageDir));
  }
  console.log(`[create] tar → ${archive}`);
  {
    const r = spawnSync("tar.exe", tarArgs, { stdio: "inherit" });
    if ((r.status ?? 1) !== 0) throw new Error("tar failed");
  }
  fs.rmSync(dumpFile, { force: true });

  const size = fs.statSync(archive).size;
  const digest = await sha256File(archive);

  const client = new Client({ connectionString: conn.dsn });
  await client.connect();
  try {
    // Ensure table exists — the app also does this on boot.
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_snapshots (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        path         TEXT NOT NULL,
        size_bytes   BIGINT NOT NULL,
        detail       JSONB NOT NULL DEFAULT '{}'::JSONB,
        sha256       TEXT,
        verified_at  TIMESTAMPTZ,
        tag          TEXT,
        kind         TEXT NOT NULL DEFAULT 'manual'
      )
    `);
    const r = await client.query(
      `INSERT INTO platform_snapshots
         (path, size_bytes, sha256, tag, kind,
          verified_at, detail)
       VALUES ($1,$2,$3,$4,$5,now(),
               jsonb_build_object('created_by', $6, 'host', $7))
       RETURNING id, created_at`,
      [archive, size, digest, tag, kind, os.userInfo().username, os.hostname()],
    );
    console.log(
      JSON.stringify(
        {
          id: r.rows[0].id,
          created_at: r.rows[0].created_at,
          path: archive,
          size_bytes: size,
          sha256: digest,
          tag,
          kind,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}
