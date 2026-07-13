// Bootstrap script run once by NSIS after files are staged.
//   node bootstrap/init.js --company "Acme" --admin-email "a@b.com" --admin-password "..." --install-id <uuid>
//
// Phase 2 responsibilities:
//   1. Write %ProgramData%\OPSQAI\config\config.json atomically.
//   2. Wait for OpsqaiDatabase to accept connections (embedded mode).
//   3. Create the opsqai database + run app migrations.
//   4. Seed the first admin user.
//   5. Trust Caddy's local root CA into LocalMachine\Root.
//
// Wizard integration lands in Phase 3 — this script is the contract the
// wizard invokes at step 9 (Install).

'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { programData, programFiles } = require('../common/config');

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
}

const installId     = arg('install-id', crypto.randomUUID());
const companyName   = arg('company', 'OPSQAI Customer');
const adminEmail    = arg('admin-email');
const adminPassword = arg('admin-password');
const dbMode        = arg('db-mode', 'embedded');
const storageMode   = arg('storage-mode', 'local');

if (!adminEmail || !adminPassword) {
  console.error('Usage: init.js --admin-email <e> --admin-password <p> [--company <name>]');
  process.exit(2);
}

const config = {
  version: '1.0.0',
  installId,
  company: { name: companyName, contactEmail: adminEmail, timezone: 'UTC' },
  database: dbMode === 'embedded'
    ? { mode: 'embedded', embedded: { port: 55432 } }
    : { mode: 'external', external: JSON.parse(arg('db-external', '{}')) },
  storage: storageMode === 'local'
    ? { mode: 'local', local: { path: programData('data', 'storage') } }
    : { mode: 's3', s3: JSON.parse(arg('storage-s3', '{}')) },
  ai: JSON.parse(arg('ai', '{"provider":"none"}')),
  updates: { channel: 'stable', manifestUrl: 'https://updates.opsqai.de/channel/stable/manifest.json' },
};

const cfgDir  = programData('config');
const cfgPath = path.join(cfgDir, 'config.json');
fs.mkdirSync(cfgDir, { recursive: true });
fs.mkdirSync(programData('data', 'storage'), { recursive: true });
fs.mkdirSync(programData('logs'), { recursive: true });

// Atomic write.
const tmp = cfgPath + '.tmp';
fs.writeFileSync(tmp, JSON.stringify(config, null, 2));
fs.renameSync(tmp, cfgPath);
console.log(`[bootstrap] wrote ${cfgPath}`);

// Wait for embedded postgres if applicable.
if (dbMode === 'embedded') {
  const port = config.database.embedded.port;
  const start = Date.now();
  const deadline = start + 60_000;
  (function wait() {
    const s = net.connect(port, '127.0.0.1');
    s.once('connect', () => { s.end(); console.log(`[bootstrap] postgres ready in ${Date.now() - start} ms`); afterDb(); });
    s.once('error', () => {
      if (Date.now() > deadline) { console.error('[bootstrap] postgres not ready after 60s'); process.exit(3); }
      setTimeout(wait, 1000);
    });
  })();
} else {
  afterDb();
}

function afterDb() {
  // Migrations + seed admin: delegated to the app bundle so the SQL stays
  // owned by the application, not by the installer.
  const appDir = programFiles('app');
  const migrator = path.join(appDir, 'server', 'migrate.mjs');
  if (fs.existsSync(migrator)) {
    console.log('[bootstrap] running app migrations');
    execFileSync(programFiles('runtime', 'node', 'node.exe'), [migrator], {
      stdio: 'inherit',
      env: { ...process.env, OPSQAI_ADMIN_EMAIL: adminEmail, OPSQAI_ADMIN_PASSWORD: adminPassword, OPSQAI_CONFIG: cfgPath },
    });
  } else {
    console.log('[bootstrap] app migrator not present (Phase 2 skeleton) — skipping');
  }

  // Trust Caddy's root CA. Caddy places it at
  // %ProgramData%\OPSQAI\certs\pki\authorities\local\root.crt after first run.
  const rootCert = programData('certs', 'pki', 'authorities', 'local', 'root.crt');
  if (fs.existsSync(rootCert)) {
    try {
      execFileSync('certutil.exe', ['-addstore', '-f', 'Root', rootCert], { stdio: 'inherit' });
      console.log('[bootstrap] Caddy root CA trusted');
    } catch (e) {
      console.warn(`[bootstrap] failed to trust Caddy root: ${e.message}`);
    }
  }
  console.log('[bootstrap] done');
}
