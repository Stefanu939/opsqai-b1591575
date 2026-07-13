// Shared config loader for all OPSQAI services.
// Reads %ProgramData%\OPSQAI\config\config.json, resolves secrets via
// Windows Credential Manager (added in Phase 3 wizard). Phase 2 supports
// plaintext fallback in the same file to keep the smoke test working.

'use strict';
const fs = require('fs');
const path = require('path');

const DEFAULT_PATH = process.env.OPSQAI_CONFIG
  || path.join(process.env.ProgramData || 'C:\\ProgramData', 'OPSQAI', 'config', 'config.json');

function loadConfig(p = DEFAULT_PATH) {
  if (!fs.existsSync(p)) {
    throw new Error(`OPSQAI config not found at ${p}. Run the installer.`);
  }
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  // Structural defaults for Phase 2 smoke tests
  raw.database ??= { mode: 'embedded', embedded: { port: 55432 } };
  raw.storage  ??= { mode: 'local', local: { path: path.join(process.env.ProgramData, 'OPSQAI', 'data', 'storage') } };
  raw.updates  ??= { channel: 'stable', manifestUrl: 'https://updates.opsqai.de/channel/stable/manifest.json' };
  return raw;
}

function programData(...parts) {
  return path.join(process.env.ProgramData || 'C:\\ProgramData', 'OPSQAI', ...parts);
}
function programFiles(...parts) {
  const base = process.env['ProgramW6432'] || process.env['ProgramFiles'] || 'C:\\Program Files';
  return path.join(base, 'OPSQAI', ...parts);
}

module.exports = { loadConfig, programData, programFiles, DEFAULT_PATH };
