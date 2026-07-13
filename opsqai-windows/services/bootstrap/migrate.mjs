// OPSQAI Windows migration runner.
// Runs inside the installed Windows payload with bundled Node and psql.exe.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const installRoot = resolve(here, '..', '..');
const programData = process.env.ProgramData || 'C:\\ProgramData';
const configPath = process.env.OPSQAI_CONFIG || join(programData, 'OPSQAI', 'config', 'config.json');
const migrationsDir = join(installRoot, 'app', 'migrations');
const psql = join(installRoot, 'pgsql', 'bin', 'psql.exe');

function fail(message, code = 1) {
  console.error(`[migrate] ${message}`);
  process.exit(code);
}

if (!existsSync(configPath)) fail(`config not found at ${configPath}`);
if (!existsSync(migrationsDir)) fail(`migrations not found at ${migrationsDir}`);
if (!existsSync(psql)) fail(`psql.exe not found at ${psql}`);

const cfg = JSON.parse(readFileSync(configPath, 'utf8'));

function databaseEnv() {
  if (cfg.database?.mode === 'external') {
    const db = cfg.database.external || {};
    return {
      PGHOST: db.host,
      PGPORT: String(db.port || 5432),
      PGDATABASE: db.database || 'opsqai',
      PGUSER: db.username || 'opsqai',
      PGPASSWORD: db.password || '',
    };
  }
  const embedded = cfg.database?.embedded || {};
  return {
    PGHOST: '127.0.0.1',
    PGPORT: String(embedded.port || 55432),
    PGDATABASE: 'opsqai',
    PGUSER: 'opsqai',
    PGPASSWORD: embedded.password || '',
  };
}

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('[migrate] no SQL migrations bundled');
  process.exit(0);
}

const env = { ...process.env, ...databaseEnv(), ON_ERROR_STOP: '1' };

console.log(`[migrate] applying ${files.length} migrations from ${migrationsDir}`);
for (const file of files) {
  const full = join(migrationsDir, file);
  console.log(`[migrate] ${file}`);
  const result = spawnSync(psql, ['--set', 'ON_ERROR_STOP=1', '--file', full], {
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.status !== 0) fail(`${file} failed with exit code ${result.status}`, result.status || 1);
}

console.log('[migrate] complete');