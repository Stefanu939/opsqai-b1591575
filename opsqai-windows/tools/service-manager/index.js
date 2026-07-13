// OPSQAI Service Manager — administrative CLI for the on-prem deployment.
//
//   opsqai status
//   opsqai start | stop | restart [service]
//   opsqai logs <service> [--tail 200]
//   opsqai health
//   opsqai update check
//   opsqai update apply         # runs the staged installer, exits current node
//   opsqai backup <path>        # pg_dump + storage copy
//   opsqai config get|set <key> [value]
//
// Runs elevated (checks IsUserAnAdmin via `net session`). Everything the
// wizard writes into %ProgramData%\OPSQAI\config\config.json is accessible
// through the `config` subcommand so the operator does not need to edit
// JSON by hand.

"use strict";
const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFileSync, spawnSync, spawn } = require("child_process");
const {
  loadConfig,
  saveConfig,
  programData,
  programFiles,
} = require("../../services/common/config");

const SERVICES = [
  "OpsqaiDatabase",
  "OpsqaiPlatform",
  "OpsqaiWorker",
  "OpsqaiCaddy",
  "OpsqaiUpdater",
];
const winsw = (name) => programFiles("winsw", `${name}.exe`);

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}
function isAdmin() {
  const r = spawnSync("net", ["session"], { stdio: "ignore" });
  return r.status === 0;
}
function svc(name, action) {
  const exe = winsw(name);
  if (!fs.existsSync(exe)) return { code: 127, stdout: "", stderr: "wrapper missing" };
  const r = spawnSync(exe, [action], { encoding: "utf8" });
  return { code: r.status ?? 0, stdout: r.stdout || "", stderr: r.stderr || "" };
}
function svcStatus(name) {
  const r = svc(name, "status");
  const s = (r.stdout + r.stderr).trim().toLowerCase();
  if (s.includes("started") || s.includes("running")) return "running";
  if (s.includes("stopped")) return "stopped";
  if (s.includes("not installed")) return "not-installed";
  return s || "unknown";
}

const cmds = {
  status() {
    console.log("OPSQAI service status");
    console.log("─".repeat(48));
    for (const s of SERVICES) {
      const st = svcStatus(s);
      const mark = st === "running" ? "●" : st === "stopped" ? "○" : "⚠";
      console.log(`  ${mark}  ${s.padEnd(18)} ${st}`);
    }
  },
  start(name) {
    for (const s of name ? [name] : SERVICES)
      console.log(s, svc(s, "start").code === 0 ? "ok" : "fail");
  },
  stop(name) {
    for (const s of name ? [name] : [...SERVICES].reverse())
      console.log(s, svc(s, "stop").code === 0 ? "ok" : "fail");
  },
  restart(name) {
    cmds.stop(name);
    cmds.start(name);
  },

  logs(name, ...rest) {
    if (!name) die("usage: opsqai logs <service> [--tail N]");
    const tail = Number(rest[rest.indexOf("--tail") + 1] || 200);
    const dir = programData("logs");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(name))
      .sort();
    if (!files.length) die(`no logs for ${name}`);
    const file = path.join(dir, files[files.length - 1]);
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    console.log(lines.slice(-tail).join("\n"));
  },

  async health() {
    const r = await new Promise((resolve) => {
      https
        .get("https://localhost/health", { rejectUnauthorized: false, timeout: 5000 }, (res) => {
          res.resume();
          resolve({ status: res.statusCode });
        })
        .on("error", (e) => resolve({ status: 0, error: e.message }))
        .on("timeout", function () {
          this.destroy();
          resolve({ status: 0, error: "timeout" });
        });
    });
    console.log(`health: ${r.status || "unreachable"} ${r.error || ""}`.trim());
    process.exit(r.status && r.status < 500 ? 0 : 1);
  },

  update(sub = "check") {
    const stateFile = programData("updates", "state.json");
    let state = {};
    try {
      state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    } catch {}
    if (sub === "check") {
      console.log(`last check:   ${state.lastCheck || "never"}`);
      console.log(`last staged:  ${state.lastStaged?.version || "none"}`);
      if (state.lastStaged) console.log(`path:         ${state.lastStaged.path}`);
      return;
    }
    if (sub === "apply") {
      if (!state.lastStaged?.path || !fs.existsSync(state.lastStaged.path))
        die("no staged update — run `opsqai update check` first, or wait for the next poll cycle.");
      if (!isAdmin())
        die(
          "update apply requires administrator (right-click Command Prompt → Run as administrator).",
        );
      console.log(`Launching installer: ${state.lastStaged.path}`);
      spawn(state.lastStaged.path, [], { detached: true, stdio: "ignore" }).unref();
      process.exit(0);
    }
    die(`unknown update subcommand: ${sub}`);
  },

  backup(dest) {
    if (!dest) die("usage: opsqai backup <folder>");
    if (!isAdmin()) die("backup requires administrator.");
    fs.mkdirSync(dest, { recursive: true });
    const cfg = loadConfig();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dumpFile = path.join(dest, `opsqai-${stamp}.sql`);
    if (cfg.database.mode === "embedded") {
      const pgDump = programFiles("pgsql", "bin", "pg_dump.exe");
      const port = String(cfg.database.embedded.port);
      const pw = cfg.database.embedded.password || "";
      execFileSync(
        pgDump,
        ["-h", "127.0.0.1", "-p", port, "-U", "opsqai", "-F", "c", "-f", dumpFile, "opsqai"],
        { stdio: "inherit", env: { ...process.env, PGPASSWORD: pw } },
      );
    } else {
      const ext = cfg.database.external;
      const pgDump = programFiles("pgsql", "bin", "pg_dump.exe");
      execFileSync(
        pgDump,
        [
          "-h",
          ext.host,
          "-p",
          String(ext.port),
          "-U",
          ext.username,
          "-F",
          "c",
          "-f",
          dumpFile,
          ext.database,
        ],
        { stdio: "inherit", env: { ...process.env, PGPASSWORD: ext.password } },
      );
    }
    console.log(`database -> ${dumpFile}`);
    if (cfg.storage.mode === "local" && fs.existsSync(cfg.storage.local.path)) {
      const storageDest = path.join(dest, `storage-${stamp}`);
      execFileSync(
        "robocopy.exe",
        [cfg.storage.local.path, storageDest, "/MIR", "/NFL", "/NDL", "/NP"],
        { stdio: "inherit" },
      );
      console.log(`storage -> ${storageDest}`);
    }
    console.log("backup complete");
  },

  config(op, key, ...rest) {
    const cfg = loadConfig();
    if (op === "get") {
      if (!key) return console.log(JSON.stringify(cfg, null, 2));
      const v = key.split(".").reduce((o, k) => (o ? o[k] : undefined), cfg);
      console.log(typeof v === "object" ? JSON.stringify(v, null, 2) : v);
      return;
    }
    if (op === "set") {
      if (!key || !rest.length) die("usage: opsqai config set <dotted.key> <value>");
      if (!isAdmin()) die("config set requires administrator.");
      const parts = key.split(".");
      const leaf = parts.pop();
      const parent = parts.reduce((o, k) => (o[k] ??= {}), cfg);
      const raw = rest.join(" ");
      let val = raw;
      if (raw === "true") val = true;
      else if (raw === "false") val = false;
      else if (/^-?\d+$/.test(raw)) val = Number(raw);
      parent[leaf] = val;
      saveConfig(cfg);
      console.log(`set ${key} = ${JSON.stringify(val)}`);
      return;
    }
    die("usage: opsqai config get|set <key> [value]");
  },
};

const [, , cmd, ...args] = process.argv;
if (!cmd || !cmds[cmd]) {
  console.log("OPSQAI Service Manager");
  console.log("  opsqai status");
  console.log("  opsqai start|stop|restart [service]");
  console.log("  opsqai logs <service> [--tail N]");
  console.log("  opsqai health");
  console.log("  opsqai update check|apply");
  console.log("  opsqai backup <folder>");
  console.log("  opsqai config get|set <dotted.key> [value]");
  process.exit(cmd ? 1 : 0);
}
Promise.resolve(cmds[cmd](...args)).catch((e) => die(e.stack || e.message));
