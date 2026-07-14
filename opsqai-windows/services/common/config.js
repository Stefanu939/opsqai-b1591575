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
  // Clear stale tmp from a previous crashed run (would otherwise EPERM on Windows).
  try {
    fs.unlinkSync(tmp);
  } catch (e) {
    if (e && e.code !== "ENOENT") {
      // best-effort: try to strip read-only attribute then retry
      try {
        fs.chmodSync(tmp, 0o600);
        fs.unlinkSync(tmp);
      } catch {}
    }
  }
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  // On Windows, rename() fails with EPERM if the destination exists AND is
  // locked, read-only, or ACL-restricted (icacls tightens config.json to
  // SYSTEM+Admins on the first run). Unlink first, then rename. Fall back to
  // copyFile + unlink of the tmp for edge cases where the destination handle
  // is still transiently held (AV scanners, backup agents).
  try {
    if (fs.existsSync(p)) {
      try {
        fs.chmodSync(p, 0o600);
      } catch {}
      fs.unlinkSync(p);
    }
    fs.renameSync(tmp, p);
  } catch (err) {
    if (err && (err.code === "EPERM" || err.code === "EBUSY" || err.code === "EACCES")) {
      // Retry with a short backoff, then fall back to copy+unlink.
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        try {
          if (fs.existsSync(p)) fs.unlinkSync(p);
          fs.renameSync(tmp, p);
          return;
        } catch {
          // wait 100ms
          const w = Date.now() + 100;
          while (Date.now() < w) {}
        }
      }
      // Last resort: copy over the top.
      fs.copyFileSync(tmp, p);
      try {
        fs.unlinkSync(tmp);
      } catch {}
      return;
    }
    throw err;
  }
}

function programData(...parts) {
  return path.join(process.env.ProgramData || "C:\\ProgramData", "OPSQAI", ...parts);
}
function programFiles(...parts) {
  const base = process.env["ProgramW6432"] || process.env["ProgramFiles"] || "C:\\Program Files";
  return path.join(base, "OPSQAI", ...parts);
}

module.exports = { loadConfig, saveConfig, programData, programFiles, DEFAULT_PATH };
