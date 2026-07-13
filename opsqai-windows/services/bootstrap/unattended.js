// Unattended bootstrap wrapper: reads answers.json produced by the ops team
// and forwards fields as CLI flags to services/bootstrap/init.js. Invoked by
// NSIS when the installer is run as `OPSQAI-Setup.exe /S /CONFIG=<path>`.

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}
const cfgPath = arg('config');
if (!cfgPath || !fs.existsSync(cfgPath)) {
  console.error('[unattended] --config <answers.json> is required');
  process.exit(2);
}
const a = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

function required(obj, dotted) {
  const v = dotted.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
  if (v === undefined || v === null || v === '') {
    console.error(`[unattended] missing required field: ${dotted}`);
    process.exit(2);
  }
  return v;
}
required(a, 'admin.email');
required(a, 'admin.password');

const args = [
  path.join(__dirname, 'init.js'),
  '--install-id',     a.installId || crypto.randomUUID(),
  '--company',        a.company?.name || 'OPSQAI Customer',
  '--admin-email',    a.admin.email,
  '--admin-password', a.admin.password,
  '--db-mode',        a.database?.mode  || 'embedded',
  '--storage-mode',   a.storage?.mode   || 'local',
  '--ai',             JSON.stringify(a.ai || { provider: 'none' }),
];
if (a.database?.mode === 'external') args.push('--db-external', JSON.stringify(a.database.external || {}));
if (a.storage?.mode  === 's3')       args.push('--storage-s3',  JSON.stringify(a.storage.s3       || {}));

const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
process.exit(r.status ?? 1);
