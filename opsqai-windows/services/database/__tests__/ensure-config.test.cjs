// Unit tests for ensureConfig — runs on any platform via `node --test`.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ensureConfig, SENTINEL, HBA_CONTENT } = require("../ensure-config");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "opsqai-pg-test-"));
}

test("creates postgresql.conf and pg_hba.conf on empty data dir", () => {
  const d = tmpDir();
  const r = ensureConfig(d, 55432);
  assert.equal(r.postgresqlConfChanged, true);
  assert.equal(r.pgHbaChanged, true);
  const conf = fs.readFileSync(path.join(d, "postgresql.conf"), "utf8");
  assert.ok(conf.includes(SENTINEL));
  assert.ok(conf.includes("port = 55432"));
  assert.ok(conf.includes("listen_addresses = '127.0.0.1'"));
  assert.equal(fs.readFileSync(path.join(d, "pg_hba.conf"), "utf8"), HBA_CONTENT);
});

test("appends OPSQAI block when sentinel is missing (stale initdb-only dir)", () => {
  const d = tmpDir();
  // Simulate what initdb writes: a full postgresql.conf with commented defaults
  // and NO OPSQAI block — this is the exact broken state seen in the field.
  fs.writeFileSync(
    path.join(d, "postgresql.conf"),
    "#port = 5432\n#listen_addresses = 'localhost'\n",
  );
  fs.writeFileSync(path.join(d, "pg_hba.conf"), "local all all trust\n");

  const r = ensureConfig(d, 55432);
  assert.equal(r.postgresqlConfChanged, true);
  assert.match(r.postgresqlConfAction, /appended/);
  assert.equal(r.pgHbaChanged, true);

  const conf = fs.readFileSync(path.join(d, "postgresql.conf"), "utf8");
  assert.ok(conf.includes(SENTINEL));
  assert.ok(conf.includes("port = 55432"));
  // Original commented defaults preserved.
  assert.ok(conf.includes("#port = 5432"));
});

test("no-op when sentinel present with matching port", () => {
  const d = tmpDir();
  ensureConfig(d, 55432);
  const r = ensureConfig(d, 55432);
  assert.equal(r.postgresqlConfChanged, false);
  assert.equal(r.pgHbaChanged, false);
});

test("rewrites port line inside OPSQAI block on drift", () => {
  const d = tmpDir();
  ensureConfig(d, 55432);
  const r = ensureConfig(d, 55499);
  assert.equal(r.postgresqlConfChanged, true);
  assert.match(r.postgresqlConfAction, /drift/);
  const conf = fs.readFileSync(path.join(d, "postgresql.conf"), "utf8");
  assert.ok(conf.includes("port = 55499"));
  assert.ok(!/^\s*port\s*=\s*55432\s*$/m.test(conf));
});

test("restores pg_hba.conf if operator broadened it to trust", () => {
  const d = tmpDir();
  ensureConfig(d, 55432);
  fs.writeFileSync(path.join(d, "pg_hba.conf"), "host all all 0.0.0.0/0 trust\n");
  const r = ensureConfig(d, 55432);
  assert.equal(r.pgHbaChanged, true);
  assert.equal(fs.readFileSync(path.join(d, "pg_hba.conf"), "utf8"), HBA_CONTENT);
});
