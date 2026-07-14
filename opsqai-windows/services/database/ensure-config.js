// Idempotent postgresql.conf / pg_hba.conf provisioning for the embedded
// PostgreSQL instance. Split into its own module so it can be unit-tested
// on any platform (the rest of the OpsqaiDatabase service is Windows-only).

"use strict";
const fs = require("fs");
const path = require("path");

const SENTINEL = "# --- OPSQAI ---";

function opsqaiBlock(port) {
  return (
    `\n${SENTINEL}\n` +
    `listen_addresses = '127.0.0.1'\n` +
    `port = ${port}\n` +
    `password_encryption = scram-sha-256\n` +
    `logging_collector = on\n` +
    `log_directory = 'log'\n` +
    `log_filename = 'postgresql-%Y-%m-%d.log'\n`
  );
}

const HBA_CONTENT =
  `# OPSQAI: Windows loopback-only, scram-sha-256\n` +
  `host   all  all  127.0.0.1/32  scram-sha-256\n` +
  `host   all  all  ::1/128       scram-sha-256\n`;

/**
 * Ensure postgresql.conf contains the OPSQAI settings block for the given
 * port, and pg_hba.conf is locked to loopback + scram. Safe to call every
 * boot: no-ops when already correct, self-heals drift.
 *
 * Returns a summary of what was changed for logging.
 */
function ensureConfig(dataDir, port) {
  const confPath = path.join(dataDir, "postgresql.conf");
  const hbaPath = path.join(dataDir, "pg_hba.conf");

  const summary = {
    postgresqlConfChanged: false,
    postgresqlConfAction: "unchanged",
    pgHbaChanged: false,
  };

  // --- postgresql.conf ---
  if (!fs.existsSync(confPath)) {
    fs.writeFileSync(confPath, opsqaiBlock(port));
    summary.postgresqlConfChanged = true;
    summary.postgresqlConfAction = "created";
  } else {
    const raw = fs.readFileSync(confPath, "utf8");
    if (!raw.includes(SENTINEL)) {
      fs.appendFileSync(confPath, opsqaiBlock(port));
      summary.postgresqlConfChanged = true;
      summary.postgresqlConfAction = "OPSQAI block appended";
    } else {
      // Sentinel present — verify port line matches. Only rewrite the port
      // line inside the OPSQAI block to avoid clobbering operator edits.
      const lines = raw.split(/\r?\n/);
      const sentinelIdx = lines.findIndex((l) => l.trim() === SENTINEL);
      let rewrote = false;
      for (let i = sentinelIdx + 1; i < lines.length; i++) {
        const m = lines[i].match(/^\s*port\s*=\s*(\d+)/);
        if (m) {
          if (Number(m[1]) !== Number(port)) {
            lines[i] = `port = ${port}`;
            rewrote = true;
          }
          break;
        }
        // Stop at a blank line if the block is followed by another section.
        if (lines[i].trim() === "" && i > sentinelIdx + 5) break;
      }
      if (rewrote) {
        fs.writeFileSync(confPath, lines.join("\n"));
        summary.postgresqlConfChanged = true;
        summary.postgresqlConfAction = `port drift corrected -> ${port}`;
      }
    }
  }

  // --- pg_hba.conf --- always overwrite; the content is fixed policy.
  const currentHba = fs.existsSync(hbaPath) ? fs.readFileSync(hbaPath, "utf8") : "";
  if (currentHba !== HBA_CONTENT) {
    fs.writeFileSync(hbaPath, HBA_CONTENT);
    summary.pgHbaChanged = true;
  }

  return summary;
}

module.exports = { ensureConfig, SENTINEL, HBA_CONTENT };
