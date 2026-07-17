// Snapshot integrity verifier.
//
// Phase 6. Recomputes SHA-256 for a stored snapshot and compares
// against `platform_snapshots.sha256`. Used by:
//   - the updater's pre-flight (before rolling forward, we verify the
//     snapshot we just took is readable and matches its digest)
//   - `opsqai backup verify <id>` (operator ad-hoc)
//
// Usage: node verify.js <snapshot-id>
//        node verify.js --path <archive>       (verify a raw file)

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");
const { loadConfig } = require("../common/config");

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (c) => hash.update(c));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function buildDsn(cfg) {
  if (cfg.database.mode === "embedded") {
    const port = cfg.database.embedded.port || 55432;
    const pw = cfg.database.embedded.password || "";
    const auth = pw ? `opsqai:${encodeURIComponent(pw)}` : "opsqai";
    return `postgres://${auth}@127.0.0.1:${port}/opsqai`;
  }
  const e = cfg.database.external;
  const auth =
    encodeURIComponent(e.username) + ":" + encodeURIComponent(e.password);
  return `postgres://${auth}@${e.host}:${e.port}/${e.database}`;
}

async function verifyById(id) {
  const cfg = loadConfig();
  const client = new Client({ connectionString: buildDsn(cfg) });
  await client.connect();
  try {
    const r = await client.query(
      "SELECT path, sha256 FROM platform_snapshots WHERE id = $1",
      [id],
    );
    if (!r.rows[0]) throw new Error(`Snapshot ${id} not in database`);
    const { path: p, sha256: expected } = r.rows[0];
    if (!fs.existsSync(p)) throw new Error(`Archive missing on disk: ${p}`);
    if (!expected) throw new Error(`Snapshot ${id} has no stored SHA-256`);
    const actual = await sha256File(p);
    const ok = actual.toLowerCase() === expected.toLowerCase();
    if (ok) {
      await client.query(
        "UPDATE platform_snapshots SET verified_at = now() WHERE id = $1",
        [id],
      );
    }
    return { id, path: p, expected, actual, ok };
  } finally {
    await client.end();
  }
}

async function verifyPath(p) {
  if (!fs.existsSync(p)) throw new Error(`File not found: ${p}`);
  const actual = await sha256File(p);
  return { path: path.resolve(p), actual, ok: true };
}

async function main() {
  const argv = process.argv.slice(2);
  let result;
  if (argv[0] === "--path") {
    result = await verifyPath(argv[1]);
  } else if (argv[0]) {
    result = await verifyById(argv[0]);
  } else {
    console.error("usage: verify.js <snapshot-id>  |  verify.js --path <archive>");
    process.exit(2);
  }
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}

module.exports = { sha256File, verifyById, verifyPath };
