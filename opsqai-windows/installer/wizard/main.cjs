// OPSQAI Setup Wizard — Electron main process.
// Launched by NSIS after files are staged. Collects config from the user in
// 10 steps, then invokes services/bootstrap/init.js with the gathered values.
//
// Exit codes:
//   0  success
//   1  cancelled by user
//   2+ bootstrap failure (propagated)

"use strict";
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const net = require("net");
const { spawn, spawnSync } = require("child_process");


// The wizard is packaged inside %ProgramFiles%\OPSQAI\wizard\.
// Resolve installation root two levels up.
const installRoot = path.resolve(
  app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, "..", "..", "payload"),
  "..",
);
const nodeExe = path.join(installRoot, "runtime", "node", "node.exe");
const bootstrap = path.join(installRoot, "services", "bootstrap", "init.js");

let win;

// Persistent log file so we can diagnose black-window issues without DevTools.
const logFile = path.join(os.tmpdir(), "opsqai-wizard.log");
function flog(msg) {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (_) {}
  try { console.log(msg); } catch (_) {}
}
flog(`wizard boot: pid=${process.pid} argv=${JSON.stringify(process.argv)}`);
flog(`__dirname=${__dirname} isPackaged=${app.isPackaged}`);

process.on("uncaughtException", (e) => {
  flog(`uncaughtException: ${e && e.stack ? e.stack : e}`);
  try { dialog.showErrorBox("OPSQAI Setup", `Wizard crashed:\n${e.message}\n\nLog: ${logFile}`); } catch (_) {}
});

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 820,
    minHeight: 580,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    title: "OPSQAI Self-Hosted Setup",
    icon: path.join(__dirname, "assets", "opsqai.ico"),
    backgroundColor: "#0f172a",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.setMenu(null);

  win.once("ready-to-show", () => { flog("ready-to-show"); win.show(); });

  win.webContents.on("did-finish-load", () => flog(`did-finish-load ${win.webContents.getURL()}`));
  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    const msg = `Renderer failed to load: ${desc} (${code})\nURL: ${url}`;
    flog(msg);
    dialog.showErrorBox("OPSQAI Setup", msg + `\n\nLog: ${logFile}`);
  });
  win.webContents.on("render-process-gone", (_e, details) => {
    flog(`render-process-gone: ${JSON.stringify(details)}`);
    dialog.showErrorBox(
      "OPSQAI Setup",
      `Renderer crashed: ${details.reason} (exit ${details.exitCode}).\n\nLog: ${logFile}`,
    );
  });
  win.webContents.on("console-message", (_e, level, message, line, source) => {
    flog(`renderer[${level}] ${source}:${line} ${message}`);
  });
  win.webContents.on("preload-error", (_e, preloadPath, err) => {
    flog(`preload-error ${preloadPath}: ${err && err.stack ? err.stack : err}`);
  });

  if (process.argv.includes("--enable-logging")) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  const indexPath = path.join(__dirname, "renderer", "index.html");
  flog(`loadFile ${indexPath} exists=${fs.existsSync(indexPath)}`);
  win.loadFile(indexPath).catch((err) => {
    flog(`loadFile rejected: ${err && err.stack ? err.stack : err}`);
    dialog.showErrorBox(
      "OPSQAI Setup",
      `Could not load wizard UI:\n${indexPath}\n\n${err.message}\n\nLog: ${logFile}`,
    );
  });

  win.on("close", (e) => {
    if (win.__installing) {
      e.preventDefault();
      return;
    }
  });
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.exit(1));

// -------- IPC ---------------------------------------------------------------

ipcMain.handle("wizard:cancel", async () => {
  const r = await dialog.showMessageBox(win, {
    type: "warning",
    buttons: ["Continue setup", "Exit installer"],
    defaultId: 0,
    cancelId: 0,
    title: "Cancel installation",
    message: "Are you sure you want to exit the OPSQAI setup?",
    detail: "OPSQAI will not be usable until setup completes.",
  });
  if (r.response === 1) app.exit(1);
});

ipcMain.handle("wizard:openExternal", (_e, url) => shell.openExternal(url));

ipcMain.handle("wizard:validatePort", async (_e, port) => {
  const p = Number(port);
  if (!Number.isInteger(p) || p < 1024 || p > 65535)
    return { ok: false, error: "Port must be 1024–65535" };
  return { ok: true };
});

// -------- License file picker + shallow validation -------------------------
// The bundled OPSQAI license is a JWT (three base64url parts separated by
// dots) signed with Ed25519. We only check structural shape here; the
// authoritative verification happens inside the platform at bootstrap
// via local-licensing.server.ts.
ipcMain.handle("wizard:pickLicenseFile", async () => {
  const r = await dialog.showOpenDialog(win, {
    title: "Select OPSQAI license file",
    properties: ["openFile"],
    filters: [
      { name: "OPSQAI license", extensions: ["opsqai", "lic", "jwt", "txt"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  if (r.canceled || !r.filePaths.length) return { ok: false, cancelled: true };
  try {
    const contents = fs.readFileSync(r.filePaths[0], "utf8").trim();
    return { ok: true, path: r.filePaths[0], contents };
  } catch (e) {
    return { ok: false, error: `Cannot read license: ${e.message}` };
  }
});

ipcMain.handle("wizard:validateLicense", async (_e, contents) => {
  const s = String(contents || "").trim();
  if (!s) return { ok: false, error: "License is empty" };
  const parts = s.split(".");
  if (parts.length !== 3) {
    return { ok: false, error: "Not a valid OPSQAI license (expected JWT format)" };
  }
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
    return {
      ok: true,
      claims: {
        edition: payload.edition ?? payload.tier ?? "community",
        seats: payload.seats ?? null,
        exp: payload.exp ?? null,
        customer: payload.customer ?? payload.sub ?? null,
        modules: Array.isArray(payload.modules) ? payload.modules : [],
      },
    };
  } catch (e) {
    return { ok: false, error: `License payload is not valid JSON: ${e.message}` };
  }
});

// -------- SMTP connection test ---------------------------------------------
// Uses nodemailer bundled inside the installer's wizard node_modules to
// verify the SMTP credentials the operator entered. We do NOT send a real
// message here — verify() opens the connection, authenticates, then quits.
ipcMain.handle("wizard:testSmtp", async (_e, cfg) => {
  try {
    // Loaded lazily so the wizard still starts on machines where the
    // optional dependency was pruned. The build script bundles it.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: Number(cfg.port) || 587,
      secure: !!cfg.secure,
      auth: cfg.username ? { user: cfg.username, pass: cfg.password || "" } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transporter.verify();
    transporter.close();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
});

// -------- System readiness checks (real probes) ----------------------------
// Runs on the target machine in the Electron main process, so we can hit
// the filesystem, spawn Windows utilities and try to bind local ports.
function checkPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "0.0.0.0");
  });
}
function checkAdmin() {
  // `net session` requires elevation on Windows; exit code 0 == elevated.
  if (process.platform !== "win32") return false;
  const r = spawnSync("net", ["session"], { windowsHide: true, stdio: "ignore" });
  return r.status === 0;
}
// .NET is intentionally not a prerequisite. OPSQAI services run on the
// bundled Node.js runtime and are wrapped by WinSW (self-contained Go).
// No probe needed.
function checkDiskFreeGb() {
  try {
    // fs.statfsSync is available on Node ≥ 18.15.
    if (typeof fs.statfsSync === "function") {
      const s = fs.statfsSync(process.env.SystemDrive ? process.env.SystemDrive + "\\" : "C:\\");
      return Math.floor((s.bavail * s.bsize) / 1e9);
    }
  } catch {}
  // Fallback via wmic.
  try {
    const drive = (process.env.SystemDrive || "C:").replace(/\\/g, "");
    const r = spawnSync(
      "wmic",
      ["logicaldisk", "where", `Caption='${drive}'`, "get", "FreeSpace", "/value"],
      { windowsHide: true, encoding: "utf8" },
    );
    const m = /FreeSpace=(\d+)/.exec(r.stdout || "");
    if (m) return Math.floor(Number(m[1]) / 1e9);
  } catch {}
  return -1;
}

ipcMain.handle("wizard:runSystemChecks", async () => {
  const results = {};

  const rel = os.release();
  const majorMatch = /^(\d+)\./.exec(rel);
  const winMajor = majorMatch ? Number(majorMatch[1]) : 0;
  results.windows = {
    ok: process.platform === "win32" && winMajor >= 10,
    detail:
      process.platform === "win32"
        ? `Windows ${rel}`
        : `Not Windows (${process.platform})`,
  };

  const arch = os.arch();
  const cores = os.cpus()?.length ?? 0;
  results.cpu = {
    ok: (arch === "x64" || arch === "arm64") && cores >= 2,
    detail: `${cores} cores · ${arch}`,
  };

  const totalGb = Math.round(os.totalmem() / 1e9);
  results.ram = { ok: totalGb >= 8, detail: `${totalGb} GB total` };

  const freeGb = checkDiskFreeGb();
  results.disk = {
    ok: freeGb >= 20,
    detail: freeGb < 0 ? "Unable to determine" : `${freeGb} GB free`,
  };

  results.dotnet = checkDotnet();

  const bundledPg = path.join(installRoot, "payload", "pgsql", "bin", "postgres.exe");
  const stagedPg = path.join(installRoot, "pgsql", "bin", "postgres.exe");
  const pgOk = fs.existsSync(bundledPg) || fs.existsSync(stagedPg);
  results.postgres = {
    ok: pgOk,
    detail: pgOk ? "Bundled PostgreSQL 16 present" : "Bundled PostgreSQL not found",
  };

  const portList = [443, 5432, 55432];
  const portsFree = await Promise.all(portList.map(checkPortFree));
  const blocked = portList.filter((_, i) => !portsFree[i]);
  results.ports = {
    ok: blocked.length === 0,
    detail: blocked.length ? `In use: ${blocked.join(", ")}` : "443, 5432, 55432 free",
  };

  const admin = checkAdmin();
  results.admin = { ok: admin, detail: admin ? "Elevated" : "Not running as Administrator" };

  return { ok: Object.values(results).every((r) => r.ok), results };
});

// -------- Database connection test ----------------------------------------
ipcMain.handle("wizard:testDatabase", async (_e, cfg) => {
  const host = String(cfg?.host || "").trim();
  const port = Number(cfg?.port) || 5432;
  const database = String(cfg?.database || "").trim();
  const user = String(cfg?.user || "").trim();
  const password = String(cfg?.password || "");
  if (!host || !database || !user) {
    return { ok: false, error: "Host, database and user are required" };
  }
  let Client;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ Client } = require("pg"));
  } catch (e) {
    return { ok: false, error: `pg driver not bundled: ${e.message}` };
  }
  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: cfg?.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 8_000,
    statement_timeout: 5_000,
  });
  try {
    await client.connect();
    const r = await client.query("select version() as v");
    await client.end().catch(() => {});
    return { ok: true, version: r.rows?.[0]?.v ?? "connected" };
  } catch (e) {
    try { await client.end(); } catch {}
    return { ok: false, error: e.message || String(e) };
  }
});



ipcMain.handle("wizard:install", async (event, config) => {
  win.__installing = true;
  const args = [
    bootstrap,
    "--install-id",
    config.installId,
    "--company",
    config.company.name,
    "--admin-email",
    config.admin.email,
    "--admin-password",
    config.admin.password,
    "--db-mode",
    config.database.mode,
    "--storage-mode",
    config.storage.mode,
    "--ai",
    JSON.stringify(config.ai),
  ];
  if (config.database.mode === "external") {
    args.push("--db-external", JSON.stringify(config.database.external));
  }
  if (config.storage.mode === "s3") {
    args.push("--storage-s3", JSON.stringify(config.storage.s3));
  }
  if (config.license && config.license.contents) {
    args.push("--license", config.license.contents);
  }
  if (config.smtp && config.smtp.host) {
    args.push("--smtp", JSON.stringify(config.smtp));
  }

  const send = (line) => event.sender.send("wizard:install-log", line);
  send(`> Launching bootstrap: ${nodeExe}`);

  if (!fs.existsSync(nodeExe) || !fs.existsSync(bootstrap)) {
    send(`ERROR: bootstrap payload missing (${nodeExe} / ${bootstrap})`);
    win.__installing = false;
    return { code: 127 };
  }

  return new Promise((resolve) => {
    const child = spawn(nodeExe, args, {
      cwd: installRoot,
      env: { ...process.env, FORCE_COLOR: "0" },
      windowsHide: true,
    });
    child.stdout.on("data", (b) =>
      b
        .toString()
        .split(/\r?\n/)
        .forEach((l) => l && send(l)),
    );
    child.stderr.on("data", (b) =>
      b
        .toString()
        .split(/\r?\n/)
        .forEach((l) => l && send(`! ${l}`)),
    );
    child.on("exit", (code) => {
      win.__installing = false;
      send(`> bootstrap exited with code ${code}`);
      resolve({ code: code ?? 1 });
    });
  });
});

ipcMain.handle("wizard:finish", (_e, launch) => {
  if (launch) shell.openExternal("https://localhost/");
  app.exit(0);
});
