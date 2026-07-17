// Backup: prune snapshots older than N days (`opsqai backup prune [days]`).
// Never touches kind='pre-update' rows — those are owned by the updater.

"use strict";

const fs = require("fs");
const { Client } = require("pg");
const { loadConfig } = require("../common/config");

function dsn(cfg) {
  if (cfg.database.mode === "embedded") {
    const port = cfg.database.embedded.port || 55432;
    const pw = cfg.database.embedded.password || "";
    const auth = pw ? `opsqai:${encodeURIComponent(pw)}` : "opsqai";
    return `postgres://${auth}@127.0.0.1:${port}/opsqai`;
  }
  const e = cfg.database.external;
  return `postgres://${encodeURIComponent(e.username)}:${encodeURIComponent(e.password)}@${e.host}:${e.port}/${e.database}`;
}

async function main() {
  const days = Number(process.argv[2] || 14);
  const c = new Client({ connectionString: dsn(loadConfig()) });
  await c.connect();
  try {
    const r = await c.query(
      `DELETE FROM platform_snapshots
         WHERE created_at < now() - ($1::TEXT || ' days')::INTERVAL
           AND kind <> 'pre-update'
       RETURNING id, path`,
      [String(days)],
    );
    let files = 0;
    for (const row of r.rows) {
      try {
        fs.rmSync(row.path, { force: true });
        files++;
      } catch {
        /* file may be gone */
      }
    }
    console.log(`pruned ${r.rows.length} row(s), removed ${files} file(s)`);
  } finally {
    await c.end();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e.stack || e.message);
    process.exit(1);
  });
}
