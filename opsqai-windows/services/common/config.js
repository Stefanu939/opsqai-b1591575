// Shared config loader / saver for all OPSQAI services.
// Reads/writes %ProgramData%\OPSQAI\config\config.json atomically.
// Phase 2: password fields live inline; Phase 3 wizard moves secrets to
// Windows Credential Manager (DPAPI-encrypted via `wincred`).

"use strict";
const fs = require("fs");
const path = require("path");

const DEFAULT_PATH =
  process.env.OPSQAI_CONFIG ||
  path.join(process.env.ProgramData || "C:\\ProgramData", "OPSQAI", "config", "config.json");

function loadConfig(p = DEFAULT_PATH) {
  if (!fs.existsSync(p)) {
    throw new Error(`OPSQAI config not found at ${p}. Run the installer.`);
  }
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  raw.database ??= { mode: "embedded", embedded: { port: 55432 } };
  raw.database.embedded ??= { port: 55432 };
  raw.storage ??= {
    mode: "local",
    local: {
      path: path.join(process.env.ProgramData || "C:\\ProgramData", "OPSQAI", "data", "storage"),
    },
  };
  raw.updates ??= {
    channel: "stable",
    manifestUrl: "https://updates.opsqai.de/channel/stable/manifest.json",
  };
  return raw;
}

function saveConfig(cfg, p = DEFAULT_PATH) {
  const tmp = p + ".tmp";
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, p);
}

function programData(...parts) {
  return path.join(process.env.ProgramData || "C:\\ProgramData", "OPSQAI", ...parts);
}
function programFiles(...parts) {
  const base = process.env["ProgramW6432"] || process.env["ProgramFiles"] || "C:\\Program Files";
  return path.join(base, "OPSQAI", ...parts);
}

module.exports = { loadConfig, saveConfig, programData, programFiles, DEFAULT_PATH };
