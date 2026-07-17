// Scheduled snapshot runner.
//
// Phase 6. Invoked by Windows Task Scheduler once per day (registered
// by the installer). Wraps `opsqai backup create --kind scheduled`
// so the operator sees the same output in Event Viewer as in the CLI.
//
// Exit codes:
//   0  snapshot written and pruned
//   1  snapshot failed (details written to %ProgramData%\OPSQAI\logs\backup-scheduled.log)

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { programData, programFiles, loadConfig } = require("../common/config");

const logDir = programData("logs");
const logPath = path.join(logDir, "backup-scheduled.log");

function log(msg) {
  const line = `${new Date().toISOString()}  ${msg}`;
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logPath, line + "\n");
  } catch {
    /* best-effort */
  }
  console.log(line);
}

function main() {
  const cfg = loadConfig();
  const retainDays = Number(cfg.backup?.retainDays ?? 14);
  const opsqaiCmd = programFiles("bin", "opsqai.cmd");
  if (!fs.existsSync(opsqaiCmd)) {
    log(`opsqai.cmd not found at ${opsqaiCmd} — aborting`);
    process.exit(1);
  }

  log("starting scheduled snapshot");
  const r = spawnSync(
    opsqaiCmd,
    ["backup", "create", "--kind", "scheduled", "--tag", "scheduled-daily"],
    { encoding: "utf8" },
  );
  if ((r.status ?? 1) !== 0) {
    log(`snapshot failed: exit=${r.status} stderr=${r.stderr}`);
    process.exit(1);
  }
  log(`snapshot ok: ${r.stdout.trim()}`);

  log(`pruning snapshots older than ${retainDays} day(s)`);
  const p = spawnSync(opsqaiCmd, ["backup", "prune", String(retainDays)], {
    encoding: "utf8",
  });
  if ((p.status ?? 1) !== 0) {
    log(`prune failed: exit=${p.status} stderr=${p.stderr}`);
    // Do NOT fail the scheduled job over a prune error — the snapshot
    // itself is the important side effect.
  } else {
    log(`prune ok: ${p.stdout.trim()}`);
  }
}

try {
  main();
} catch (err) {
  log(`scheduled backup crashed: ${err.stack || err.message}`);
  process.exit(1);
}
