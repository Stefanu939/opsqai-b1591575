// Detached update runner launcher.
//
// Why: OpsqaiUpdater runs from %ProgramFiles%\OPSQAI\runtime\node\node.exe and
// its own scripts live under %ProgramFiles%\OPSQAI. Replacing that tree from the
// same process fails on Windows (sharing violation: files in use). The launcher
// copies node.exe + the updater scripts into
// %ProgramData%\OPSQAI\updates\runner\<stamp>\ and starts apply.js from there as
// a detached process. That copy can stop EVERY OPSQAI service (including the
// updater itself), swap the binaries, migrate, start everything again and roll
// back on failure — with nothing under Program Files held open.

"use strict";
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { programData, programFiles } = require("../common/config");

const RUNNER_ROOT = programData("updates", "runner");
const KEEP_RUNNERS = 3;

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function pruneOldRunners() {
  try {
    const dirs = fs
      .readdirSync(RUNNER_ROOT)
      .map((n) => path.join(RUNNER_ROOT, n))
      .filter((p) => fs.statSync(p).isDirectory())
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    for (const p of dirs.slice(KEEP_RUNNERS)) fs.rmSync(p, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}

/**
 * Start apply.js out-of-tree. `mode` is "apply" (install the staged release)
 * or "rollback" (restore the last pre-update copy of the installation).
 * Returns the runner directory, or throws when the copy cannot be prepared.
 */
function launchRunner(mode = "apply") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(RUNNER_ROOT, stamp);
  const servicesDir = path.resolve(__dirname, "..");
  copyDir(path.join(servicesDir, "common"), path.join(dir, "common"));
  copyDir(path.join(servicesDir, "updater"), path.join(dir, "updater"));

  const installedNode = programFiles("runtime", "node", "node.exe");
  let node = process.execPath;
  if (fs.existsSync(installedNode)) {
    node = path.join(dir, "node.exe");
    fs.copyFileSync(installedNode, node);
  }

  const logFile = programData("logs", `update-runner-${stamp}.log`);
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const out = fs.openSync(logFile, "a");
  const args = [path.join(dir, "updater", "apply.js")];
  if (mode === "rollback") args.push("--rollback");
  const child = spawn(node, args, {
    cwd: dir,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", out, out],
    env: { ...process.env, OPSQAI_UPDATE_RUNNER: "1" },
  });
  child.unref();
  pruneOldRunners();
  return { dir, logFile, pid: child.pid };
}

module.exports = { launchRunner };
