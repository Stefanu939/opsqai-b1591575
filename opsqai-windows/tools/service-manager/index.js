// OPSQAI Service Manager — administrative CLI for the on-prem deployment.
//
//   opsqai status
//   opsqai start | stop | restart [service]
//   opsqai logs <service> [--tail 200]
//   opsqai health
//   opsqai update check | apply | history
//   opsqai backup create [--tag T] [--kind K] | list | prune [days]
//   opsqai backup verify <id> | restore <id> | schedule | unschedule
//   opsqai backup <folder>                              (legacy ad-hoc dump)
//   opsqai telemetry status | enable | disable | full
//   opsqai metrics
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

  async doctor() {
    // Phase 8: hits /api/public/doctor and pretty-prints the report.
    // Exit codes: 0 green, 1 amber, 2 red, 3 unreachable.
    const r = await new Promise((resolve) => {
      https
        .get(
          "https://localhost/api/public/doctor",
          { rejectUnauthorized: false, timeout: 10_000 },
          (res) => {
            let body = "";
            res.on("data", (c) => (body += c));
            res.on("end", () => resolve({ status: res.statusCode, body }));
          },
        )
        .on("error", (e) => resolve({ status: 0, error: e.message }))
        .on("timeout", function () {
          this.destroy();
          resolve({ status: 0, error: "timeout" });
        });
    });
    if (!r.status) {
      console.error(`doctor: unreachable (${r.error})`);
      process.exit(3);
    }
    let report;
    try {
      report = JSON.parse(r.body);
    } catch {
      console.error("doctor: invalid JSON response");
      process.exit(3);
    }
    const glyph = { green: "●", amber: "◐", red: "○", "n/a": "·" };
    console.log(`OPSQAI Doctor  —  overall: ${report.overall.toUpperCase()}`);
    console.log("─".repeat(72));
    for (const f of report.findings || []) {
      const g = glyph[f.severity] || "?";
      console.log(`  ${g}  [${f.category.padEnd(11)}] ${f.id.padEnd(22)} ${f.message}`);
      if (f.actionable) console.log(`         → ${f.actionable}`);
    }
    console.log("─".repeat(72));
    console.log(`generated: ${report.generatedAt}`);
    process.exit(
      report.overall === "green" || report.overall === "n/a"
        ? 0
        : report.overall === "amber"
          ? 1
          : 2,
    );
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

      // Phase 7 orchestrated apply: pre-flight → snapshot → binary
      // copy → installer swap → migrate → health probe → auto rollback.
      // apply.js exits with 0 on success, 4 on rollback, 99 on fatal.
      const applyScript = path.resolve(__dirname, "..", "..", "services", "updater", "apply.js");
      const stagedApply = programFiles("services", "updater", "apply.js");
      const script = fs.existsSync(stagedApply) ? stagedApply : applyScript;
      console.log(`Orchestrating update: ${state.lastStaged.version}`);
      const r = spawnSync(process.execPath, [script], { stdio: "inherit" });
      process.exit(r.status ?? 1);
    }
    if (sub === "history") {
      const jsonl = programData("logs", "update-history.jsonl");
      if (!fs.existsSync(jsonl)) return console.log("(no history yet)");
      const rows = fs
        .readFileSync(jsonl, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(-20)
        .map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      for (const r of rows) {
        console.log(
          `${r.started_at}  ${r.from_version} → ${r.to_version}  ${r.outcome}${r.failed_step ? " (" + r.failed_step + ")" : ""}`,
        );
      }
      return;
    }
    die(`unknown update subcommand: ${sub}`);
  },

  backup(sub, ...rest) {
    // Legacy: `opsqai backup <folder>` still supported so pre-Phase-6
    // callers (external scripts, older docs) keep working.
    if (sub && sub !== "create" && sub !== "list" && sub !== "prune" &&
        sub !== "verify" && sub !== "restore" && sub !== "schedule" &&
        sub !== "unschedule") {
      return cmds._backupLegacy(sub);
    }
    sub = sub || "list";

    if (sub === "list") {
      const script = path.resolve(__dirname, "..", "..", "services", "backup", "list.js");
      const staged = programFiles("services", "backup", "list.js");
      const s = fs.existsSync(staged) ? staged : script;
      if (!fs.existsSync(s)) die("backup list script missing");
      const r = spawnSync(process.execPath, [s], { stdio: "inherit" });
      process.exit(r.status ?? 1);
    }
    if (sub === "create") {
      if (!isAdmin()) die("backup create requires administrator.");
      // Parse --tag / --kind from rest.
      const args = { tag: null, kind: "manual" };
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === "--tag") args.tag = rest[++i];
        else if (rest[i] === "--kind") args.kind = rest[++i];
      }
      const script = path.resolve(__dirname, "..", "..", "services", "backup", "create.js");
      const staged = programFiles("services", "backup", "create.js");
      const s = fs.existsSync(staged) ? staged : script;
      if (!fs.existsSync(s)) die("backup create script missing");
      const r = spawnSync(process.execPath, [s, args.kind, args.tag || ""], {
        stdio: "inherit",
      });
      process.exit(r.status ?? 1);
    }
    if (sub === "prune") {
      if (!isAdmin()) die("backup prune requires administrator.");
      const days = Number(rest[0] || 14);
      const script = path.resolve(__dirname, "..", "..", "services", "backup", "prune.js");
      const staged = programFiles("services", "backup", "prune.js");
      const s = fs.existsSync(staged) ? staged : script;
      if (!fs.existsSync(s)) die("backup prune script missing");
      const r = spawnSync(process.execPath, [s, String(days)], { stdio: "inherit" });
      process.exit(r.status ?? 1);
    }
    if (sub === "verify") {
      const id = rest[0];
      if (!id) die("usage: opsqai backup verify <snapshot-id>");
      const script = path.resolve(__dirname, "..", "..", "services", "backup", "verify.js");
      const staged = programFiles("services", "backup", "verify.js");
      const s = fs.existsSync(staged) ? staged : script;
      const r = spawnSync(process.execPath, [s, id], { stdio: "inherit" });
      process.exit(r.status ?? 1);
    }
    if (sub === "restore") {
      const id = rest[0];
      if (!id) die("usage: opsqai backup restore <snapshot-id>");
      if (!isAdmin()) die("backup restore requires administrator.");
      const script = path.resolve(__dirname, "..", "..", "services", "backup", "restore.js");
      const staged = programFiles("services", "backup", "restore.js");
      const s = fs.existsSync(staged) ? staged : script;
      if (!fs.existsSync(s)) die("backup restore script missing");
      const r = spawnSync(process.execPath, [s, id], { stdio: "inherit" });
      process.exit(r.status ?? 1);
    }
    if (sub === "schedule") {
      if (!isAdmin()) die("backup schedule requires administrator.");
      // Register a daily 02:15 Task Scheduler entry that runs the
      // bundled scheduled.js. Idempotent — /F overwrites.
      const scheduled =
        programFiles("services", "backup", "scheduled.js") ||
        path.resolve(__dirname, "..", "..", "services", "backup", "scheduled.js");
      const node = process.execPath;
      const cmdLine = `"${node}" "${scheduled}"`;
      const r = spawnSync(
        "schtasks.exe",
        [
          "/Create",
          "/F",
          "/SC",
          "DAILY",
          "/ST",
          "02:15",
          "/RL",
          "HIGHEST",
          "/RU",
          "SYSTEM",
          "/TN",
          "OPSQAI\\DailyBackup",
          "/TR",
          cmdLine,
        ],
        { stdio: "inherit" },
      );
      process.exit(r.status ?? 1);
    }
    if (sub === "unschedule") {
      if (!isAdmin()) die("backup unschedule requires administrator.");
      const r = spawnSync(
        "schtasks.exe",
        ["/Delete", "/F", "/TN", "OPSQAI\\DailyBackup"],
        { stdio: "inherit" },
      );
      process.exit(r.status ?? 1);
    }
    die(`unknown backup subcommand: ${sub}`);
  },

  // Legacy `opsqai backup <folder>` — ad-hoc dump into an operator dir.
  _backupLegacy(dest) {
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
        ["-h", ext.host, "-p", String(ext.port), "-U", ext.username, "-F", "c",
         "-f", dumpFile, ext.database],
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

  telemetry(sub) {
    const cfg = loadConfig();
    cfg.telemetry = cfg.telemetry || { level: "anonymous" };
    if (!sub || sub === "status") {
      console.log(`telemetry level: ${cfg.telemetry.level}`);
      console.log(`log dir:         ${programData("logs", "telemetry")}`);
      return;
    }
    if (sub === "enable" || sub === "anonymous") {
      if (!isAdmin()) die("telemetry change requires administrator.");
      cfg.telemetry.level = "anonymous";
      saveConfig(cfg);
      return console.log("telemetry: anonymous (restart OpsqaiPlatform to apply)");
    }
    if (sub === "full") {
      if (!isAdmin()) die("telemetry change requires administrator.");
      cfg.telemetry.level = "full";
      saveConfig(cfg);
      return console.log("telemetry: full (restart OpsqaiPlatform to apply)");
    }
    if (sub === "disable") {
      if (!isAdmin()) die("telemetry change requires administrator.");
      cfg.telemetry.level = "disabled";
      saveConfig(cfg);
      return console.log("telemetry: disabled (restart OpsqaiPlatform to apply)");
    }
    die(`unknown telemetry subcommand: ${sub}`);
  },

  async metrics() {
    const r = await new Promise((resolve) => {
      https
        .get(
          "https://localhost/api/public/metrics",
          { rejectUnauthorized: false, timeout: 5000 },
          (res) => {
            let body = "";
            res.on("data", (c) => (body += c));
            res.on("end", () => resolve({ status: res.statusCode, body }));
          },
        )
        .on("error", (e) => resolve({ status: 0, error: e.message }));
    });
    if (!r.status) die(`metrics unreachable: ${r.error}`);
    process.stdout.write(r.body);
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
if (!cmd || !cmds[cmd] || cmd.startsWith("_")) {
  console.log("OPSQAI Service Manager");
  console.log("  opsqai status");
  console.log("  opsqai start|stop|restart [service]");
  console.log("  opsqai logs <service> [--tail N]");
  console.log("  opsqai health");
  console.log("  opsqai update check|apply|history");
  console.log("  opsqai backup create|list|prune|verify|restore|schedule|unschedule");
  console.log("  opsqai backup <folder>                       (legacy)");
  console.log("  opsqai telemetry status|enable|disable|full");
  console.log("  opsqai metrics");
  console.log("  opsqai config get|set <dotted.key> [value]");
  process.exit(cmd ? 1 : 0);
}
Promise.resolve(cmds[cmd](...args)).catch((e) => die(e.stack || e.message));
