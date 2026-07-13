// OpsqaiDatabase — supervisor for the embedded PostgreSQL Portable binary.
// Only registered when config.database.mode === 'embedded'.
//
// Phase 2 hardening:
//   - initdb with --auth-local=scram-sha-256 --auth-host=scram-sha-256
//   - superuser password provisioned via --pwfile (never on argv)
//   - password persisted to config.json (owner-only ACL applied by bootstrap)
//   - listen on 127.0.0.1 only; pg_hba locked to loopback + scram
//   - clean shutdown via pg_ctl stop -m fast on SIGTERM

'use strict';
const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { loadConfig, saveConfig, programData, programFiles } = require('../common/config');

const cfg = loadConfig();
if (cfg.database.mode !== 'embedded') {
  console.log('[db] External DB mode — this service should not have been registered. Exiting.');
  process.exit(0);
}

const port    = cfg.database.embedded.port || 55432;
const pgBin   = programFiles('pgsql', 'bin');
const dataDir = programData('data', 'pgsql');
const pgCtl    = path.join(pgBin, 'pg_ctl.exe');
const initdb   = path.join(pgBin, 'initdb.exe');
const postgres = path.join(pgBin, 'postgres.exe');

function log(m) { console.log(`[${new Date().toISOString()}] [db] ${m}`); }

function ensurePassword() {
  if (cfg.database.embedded.password && cfg.database.embedded.password.length >= 24) {
    return cfg.database.embedded.password;
  }
  const pw = crypto.randomBytes(24).toString('base64url');
  cfg.database.embedded.password = pw;
  saveConfig(cfg);
  log('generated new embedded postgres password');
  return pw;
}

if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
  const pw = ensurePassword();
  fs.mkdirSync(dataDir, { recursive: true });
  const pwFile = path.join(os.tmpdir(), `opsqai-pg-${process.pid}.pw`);
  fs.writeFileSync(pwFile, pw, { mode: 0o600 });
  try {
    log(`initdb -> ${dataDir}`);
    const r = spawnSync(initdb, [
      '-D', dataDir,
      '-U', 'opsqai',
      '--auth-local=scram-sha-256',
      '--auth-host=scram-sha-256',
      `--pwfile=${pwFile}`,
      '-E', 'UTF8',
    ], { stdio: 'inherit' });
    if (r.status !== 0) { log(`initdb failed: ${r.status}`); process.exit(1); }
  } finally {
    try { fs.unlinkSync(pwFile); } catch {}
  }
  // Bind to loopback only + password-encryption default.
  fs.appendFileSync(path.join(dataDir, 'postgresql.conf'),
    `\n# --- OPSQAI ---\n` +
    `listen_addresses = '127.0.0.1'\n` +
    `port = ${port}\n` +
    `password_encryption = scram-sha-256\n` +
    `logging_collector = on\n` +
    `log_directory = 'log'\n`);
  // Restrict pg_hba to loopback + scram (initdb already did, but ensure no 'trust' entries linger).
  const hba = path.join(dataDir, 'pg_hba.conf');
  fs.writeFileSync(hba,
    `# OPSQAI: loopback-only, scram-sha-256\n` +
    `local  all  all                scram-sha-256\n` +
    `host   all  all  127.0.0.1/32  scram-sha-256\n` +
    `host   all  all  ::1/128       scram-sha-256\n`);
} else {
  // Ensure password is known even on re-registration.
  ensurePassword();
}

log(`Starting postgres on 127.0.0.1:${port}`);
const child = spawn(postgres, ['-D', dataDir], { stdio: 'inherit' });

function waitReady(attempt = 0) {
  const s = net.connect(port, '127.0.0.1');
  s.once('connect', () => { s.end(); log('Postgres is accepting connections.'); });
  s.once('error', () => {
    if (attempt >= 60) { log('Postgres did not become ready in 60s.'); return; }
    setTimeout(() => waitReady(attempt + 1), 1000);
  });
}
setTimeout(waitReady, 1000);

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    log(`Received ${sig}, stopping postgres...`);
    spawnSync(pgCtl, ['-D', dataDir, 'stop', '-m', 'fast', '-w', '-t', '30'], { stdio: 'inherit' });
    process.exit(0);
  });
}
child.on('exit', (code) => { log(`postgres exited ${code}`); process.exit(code ?? 1); });
