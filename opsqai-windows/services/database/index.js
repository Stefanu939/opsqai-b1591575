// OpsqaiDatabase — supervisor for the embedded PostgreSQL Portable binary.
// Only registered when config.database.mode === 'embedded'.
// External-DB installations do not run this service at all.
//
// Responsibilities:
//   1. On first start, initdb into %ProgramData%\OPSQAI\data\pgsql (idempotent).
//   2. Launch postgres.exe with our port, keep it in foreground so WinSW
//      treats postgres as the service process (proper stop = SIGTERM).
//   3. Health probe on 127.0.0.1:<port> before signaling ready.

'use strict';
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { loadConfig, programData, programFiles } = require('../common/config');

const cfg = loadConfig();
if (cfg.database.mode !== 'embedded') {
  console.log('[db] External DB mode — this service should not have been registered. Exiting.');
  process.exit(0);
}

const port  = cfg.database.embedded.port || 55432;
const pgBin = programFiles('pgsql', 'bin');
const dataDir = programData('data', 'pgsql');
const pgCtl  = path.join(pgBin, 'pg_ctl.exe');
const initdb = path.join(pgBin, 'initdb.exe');
const postgres = path.join(pgBin, 'postgres.exe');

function log(m) { console.log(`[${new Date().toISOString()}] [db] ${m}`); }

if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
  log(`initdb -> ${dataDir}`);
  fs.mkdirSync(dataDir, { recursive: true });
  const r = spawnSync(initdb, ['-D', dataDir, '-U', 'opsqai', '-A', 'trust', '-E', 'UTF8'], { stdio: 'inherit' });
  if (r.status !== 0) { log(`initdb failed: ${r.status}`); process.exit(1); }
  // Bind to loopback only.
  fs.appendFileSync(path.join(dataDir, 'postgresql.conf'),
    `\nlisten_addresses = '127.0.0.1'\nport = ${port}\nlogging_collector = on\nlog_directory = 'log'\n`);
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
    // WinSW sends SIGTERM; pg_ctl fastpath ensures clean shutdown.
    spawnSync(pgCtl, ['-D', dataDir, 'stop', '-m', 'fast', '-w', '-t', '30'], { stdio: 'inherit' });
    process.exit(0);
  });
}
child.on('exit', (code) => { log(`postgres exited ${code}`); process.exit(code ?? 1); });
