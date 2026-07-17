// Backup: list snapshots (`opsqai backup list`).

"use strict";

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
  const c = new Client({ connectionString: dsn(loadConfig()) });
  await c.connect();
  try {
    const r = await c.query(
      `SELECT id, created_at, size_bytes, kind, tag, sha256, verified_at
         FROM platform_snapshots
        ORDER BY created_at DESC
        LIMIT 100`,
    );
    if (!r.rows.length) return console.log("(no snapshots)");
    console.log(
      "id                                    created_at                kind         size      tag",
    );
    console.log("─".repeat(110));
    for (const row of r.rows) {
      const size = (Number(row.size_bytes) / 1024 / 1024).toFixed(1) + "MB";
      const verified = row.verified_at ? "✓" : " ";
      console.log(
        `${row.id}  ${row.created_at.toISOString()}  ${(row.kind || "manual").padEnd(11)} ${size.padStart(8)}  ${verified} ${row.tag || ""}`,
      );
    }
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
