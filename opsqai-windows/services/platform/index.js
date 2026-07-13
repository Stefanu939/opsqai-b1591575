// OpsqaiPlatform — runs the OPSQAI web application (the TanStack Start
// server bundle staged at %ProgramFiles%\OPSQAI\app\server\index.mjs).
// Caddy sits in front on :443 and proxies to us on 127.0.0.1:APP_PORT.

'use strict';
const { spawn } = require('child_process');
const path = require('path');
const { loadConfig, programFiles } = require('../common/config');

const cfg = loadConfig();
const appEntry = programFiles('app', 'server', 'index.mjs');
const appPort = Number(process.env.OPSQAI_APP_PORT || 3000);

function buildDatabaseUrl() {
  if (cfg.database.mode === 'embedded') {
    const p  = cfg.database.embedded.port || 55432;
    const pw = cfg.database.embedded.password || '';
    const auth = pw ? `opsqai:${encodeURIComponent(pw)}` : 'opsqai';
    return `postgres://${auth}@127.0.0.1:${p}/opsqai`;
  }
  const e = cfg.database.external;
  const auth = encodeURIComponent(e.username) + ':' + encodeURIComponent(e.password);
  return `postgres://${auth}@${e.host}:${e.port}/${e.database}`;
}

const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: String(appPort),
  HOST: '127.0.0.1',
  DATABASE_URL: buildDatabaseUrl(),
  OPSQAI_INSTALL_ID: cfg.installId || '',
  OPSQAI_STORAGE_MODE: cfg.storage.mode,
  OPSQAI_STORAGE_LOCAL_PATH: cfg.storage.local?.path || '',
  // Storage / AI secrets injected in Phase 3 from Credential Manager.
};

console.log(`[platform] Launching app on 127.0.0.1:${appPort}`);
const node = process.execPath; // bundled Node
const child = spawn(node, [appEntry], { env, stdio: 'inherit' });

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { try { child.kill('SIGTERM'); } catch {} });
}
child.on('exit', (code) => { console.log(`[platform] app exited ${code}`); process.exit(code ?? 1); });
