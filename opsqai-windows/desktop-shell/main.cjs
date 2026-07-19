// OPSQAI Self-Hosted — Desktop Shell (Electron main process).
//
// This is a thin client. It renders the local OPSQAI platform UI
// (served by Caddy at https://localhost) inside a native window so
// the customer sees a real desktop app instead of a browser tab.
//
// Responsibilities (only):
//   1. Wait for /health to return 200 before showing the main window.
//   2. If services are stopped, offer a one-click restart (elevated).
//   3. Accept the local Caddy certificate for localhost / 127.0.0.1
//      only, so no "Not secure" warning is ever shown.
//   4. Expose a tiny preload API for menu items (open logs, doctor,
//      open in external browser, quit).
//
// This process contains ZERO business logic. All application state
// lives in the OpsqaiPlatform Windows service (Node) and the
// OpsqaiDatabase (PostgreSQL) service.

"use strict";

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  shell,
  dialog,
  nativeImage,
  session,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");
const { spawn, spawnSync } = require("child_process");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const APP_URL = "https://localhost/";
const HEALTH_URL = "https://localhost/health";
const HEALTH_TIMEOUT_MS = 45_000;
const HEALTH_POLL_INTERVAL_MS = 750;
const REQUIRED_SERVICES = ["OpsqaiDatabase", "OpsqaiPlatform", "OpsqaiCaddy"];

// ---------------------------------------------------------------------------
// Logging (writes to %ProgramData%\OPSQAI\logs\desktop-shell.log when
// available, falls back to %TEMP% otherwise).
// ---------------------------------------------------------------------------
function resolveLogFile() {
  const programData = process.env.ProgramData || "C:\\ProgramData";
  const preferred = path.join(programData, "OPSQAI", "logs");
  try {
    fs.mkdirSync(preferred, { recursive: true });
    return path.join(preferred, "desktop-shell.log");
  } catch (_) {
    return path.join(os.tmpdir(), "opsqai-desktop-shell.log");
  }
}
const LOG_FILE = resolveLogFile();
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (_) {}
  try {
    console.log(msg);
  } catch (_) {}
}

process.on("uncaughtException", (e) => {
  log(`uncaughtException: ${e && e.stack ? e.stack : e}`);
});

// ---------------------------------------------------------------------------
// Trust the local Caddy certificate for localhost only.
// ---------------------------------------------------------------------------
// Caddy issues a self-signed cert from its internal CA for
// https://localhost. Electron would normally show "Not secure". We
// accept it — but ONLY for the two loopback hosts, so a rogue site
// on another origin cannot benefit from the exception.
app.commandLine.appendSwitch("ignore-certificate-errors-spki-list", "");

function installCertificateHandler() {
  session.defaultSession.setCertificateVerifyProc((request, callback) => {
    const host = (request.hostname || "").toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      // 0 = trusted, use certificate. -2 = fail. -3 = use verificationResult.
      callback(0);
    } else {
      callback(-3);
    }
  });
}

// ---------------------------------------------------------------------------
// Health gate — polls https://localhost/health until 200 OK or timeout.
// ---------------------------------------------------------------------------
function pingHealth(timeoutMs = 3_000) {
  return new Promise((resolve) => {
    const req = https.get(
      HEALTH_URL,
      { rejectUnauthorized: false, timeout: timeoutMs },
      (res) => {
        // Drain body so socket can be reused / closed cleanly.
        res.on("data", () => {});
        res.on("end", () => resolve(res.statusCode === 200));
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

async function waitForHealthy(sendProgress) {
  const started = Date.now();
  let attempt = 0;
  while (Date.now() - started < HEALTH_TIMEOUT_MS) {
    attempt += 1;
    const ok = await pingHealth();
    if (ok) {
      log(`health OK after ${attempt} attempt(s), ${Date.now() - started}ms`);
      return true;
    }
    if (sendProgress) {
      const elapsed = Math.round((Date.now() - started) / 1000);
      sendProgress({
        attempt,
        elapsed,
        remaining: Math.max(0, Math.round(HEALTH_TIMEOUT_MS / 1000) - elapsed),
      });
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_INTERVAL_MS));
  }
  log(`health FAILED after ${attempt} attempt(s), ${Date.now() - started}ms`);
  return false;
}

// ---------------------------------------------------------------------------
// Windows service control (best-effort — a limited user may not have
// SeStart permission on the service; we surface the error and let the
// error page offer "Run as admin to repair").
// ---------------------------------------------------------------------------
function queryService(name) {
  try {
    const out = spawnSync("sc.exe", ["query", name], { encoding: "utf8", windowsHide: true });
    if (out.status !== 0) return "UNKNOWN";
    const m = /STATE\s*:\s*\d+\s+(\w+)/.exec(out.stdout || "");
    return m ? m[1].toUpperCase() : "UNKNOWN";
  } catch (_) {
    return "UNKNOWN";
  }
}

function startService(name) {
  try {
    const out = spawnSync("sc.exe", ["start", name], { encoding: "utf8", windowsHide: true });
    return { ok: out.status === 0 || /already/i.test(out.stdout || out.stderr || ""), output: (out.stdout || "") + (out.stderr || "") };
  } catch (e) {
    return { ok: false, output: String(e && e.message) };
  }
}

function getServicesReport() {
  return REQUIRED_SERVICES.map((name) => ({ name, state: queryService(name) }));
}

async function tryStartAllServices() {
  const results = [];
  for (const name of REQUIRED_SERVICES) {
    const state = queryService(name);
    if (state === "RUNNING" || state === "START_PENDING") {
      results.push({ name, state, action: "skip" });
      continue;
    }
    const r = startService(name);
    results.push({ name, state, action: "start", ok: r.ok, output: r.output });
    log(`sc start ${name}: ok=${r.ok} out=${r.output.replace(/\s+/g, " ").slice(0, 200)}`);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------
let mainWindow = null;
let splashWindow = null;
let tray = null;

function iconPath() {
  const candidates = [
    path.join(process.resourcesPath || "", "..", "OPSQAI.ico"),
    path.join(__dirname, "..", "installer", "nsis", "assets", "opsqai.ico"),
    path.join(__dirname, "assets", "opsqai.ico"),
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return undefined;
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 340,
    frame: false,
    resizable: false,
    movable: true,
    center: true,
    transparent: false,
    backgroundColor: "#0b1220",
    alwaysOnTop: false,
    skipTaskbar: false,
    icon: iconPath(),
    title: "OPSQAI",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  splashWindow.setMenu(null);
  splashWindow.loadFile(path.join(__dirname, "renderer", "splash.html")).catch((e) => {
    log(`splash load failed: ${e && e.message}`);
  });
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#0b1220",
    icon: iconPath(),
    title: "OPSQAI",
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Local platform serves the app; allow it to reach itself.
      webSecurity: true,
    },
  });

  Menu.setApplicationMenu(buildMenu());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Anything that's not our local origin opens in the default browser.
    try {
      const u = new URL(url);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        return { action: "allow" };
      }
    } catch (_) {}
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    log(`main did-fail-load code=${code} desc=${desc} url=${url}`);
    loadErrorPage({ code, description: desc, url });
  });

  mainWindow.loadURL(APP_URL).catch((e) => {
    log(`main loadURL failed: ${e && e.message}`);
    loadErrorPage({ code: -1, description: String(e && e.message), url: APP_URL });
  });

  mainWindow.once("ready-to-show", () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function loadErrorPage(details) {
  if (!mainWindow) return;
  const services = getServicesReport();
  const payload = Buffer.from(JSON.stringify({ ...details, services, logFile: LOG_FILE })).toString(
    "base64",
  );
  const errorHtml = path.join(__dirname, "renderer", "error.html");
  mainWindow.loadFile(errorHtml, { hash: payload }).catch(() => {});
  if (!mainWindow.isVisible()) {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
  }
}

// ---------------------------------------------------------------------------
// Menu / Tray
// ---------------------------------------------------------------------------
function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "Reload",
          accelerator: "Ctrl+R",
          click: () => mainWindow && mainWindow.reload(),
        },
        { type: "separator" },
        { label: "Exit", role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Open Logs Folder",
          click: () => {
            const dir = path.join(process.env.ProgramData || "C:\\ProgramData", "OPSQAI", "logs");
            shell.openPath(dir);
          },
        },
        {
          label: "Open in Browser",
          click: () => shell.openExternal(APP_URL),
        },
        { type: "separator" },
        {
          label: "About OPSQAI",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About OPSQAI",
              message: "OPSQAI Self-Hosted",
              detail: `Version: ${app.getVersion()}\nLog file: ${LOG_FILE}`,
              buttons: ["OK"],
            });
          },
        },
      ],
    },
  ]);
}

function createTray() {
  const icon = iconPath();
  if (!icon) return;
  try {
    tray = new Tray(nativeImage.createFromPath(icon));
    tray.setToolTip("OPSQAI");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "Show OPSQAI",
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          },
        },
        {
          label: "Open in Browser",
          click: () => shell.openExternal(APP_URL),
        },
        { type: "separator" },
        { label: "Quit", click: () => app.quit() },
      ]),
    );
    tray.on("click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (e) {
    log(`tray init failed: ${e && e.message}`);
  }
}

// ---------------------------------------------------------------------------
// IPC (preload API)
// ---------------------------------------------------------------------------
ipcMain.handle("shell:getServices", () => getServicesReport());
ipcMain.handle("shell:startServices", async () => tryStartAllServices());
ipcMain.handle("shell:openLogs", () => {
  const dir = path.join(process.env.ProgramData || "C:\\ProgramData", "OPSQAI", "logs");
  return shell.openPath(dir);
});
ipcMain.handle("shell:openInBrowser", () => shell.openExternal(APP_URL));
ipcMain.handle("shell:retry", async () => {
  if (!mainWindow) return;
  loadSplashAndBoot();
});
ipcMain.handle("shell:quit", () => app.quit());
ipcMain.handle("shell:runDoctor", () => {
  // The doctor script lives in the installed platform tree; the shell
  // just opens the log folder so support can grab the last report.
  const dir = path.join(process.env.ProgramData || "C:\\ProgramData", "OPSQAI", "logs");
  return shell.openPath(dir);
});

// ---------------------------------------------------------------------------
// Boot sequence
// ---------------------------------------------------------------------------
async function loadSplashAndBoot() {
  if (!mainWindow) createMainWindow();
  if (!splashWindow) createSplash();

  const sendProgress = (p) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send("splash:progress", p);
    }
  };

  // Try health first (services may already be running from previous boot).
  const initialOk = await pingHealth(2_000);
  if (!initialOk) {
    log("health not OK on first ping — attempting to start services");
    if (splashWindow) splashWindow.webContents.send("splash:status", "Starting OPSQAI services…");
    const results = await tryStartAllServices();
    log(`service start results: ${JSON.stringify(results)}`);
  }

  if (splashWindow) splashWindow.webContents.send("splash:status", "Waiting for OPSQAI to be ready…");
  const healthy = await waitForHealthy(sendProgress);

  if (!healthy) {
    loadErrorPage({
      code: -3,
      description:
        "OPSQAI did not become ready in time. The Windows services may still be starting, or the database is not accepting connections.",
      url: HEALTH_URL,
    });
    return;
  }

  if (mainWindow) {
    mainWindow.loadURL(APP_URL).catch((e) => {
      log(`post-health loadURL failed: ${e && e.message}`);
      loadErrorPage({ code: -1, description: String(e && e.message), url: APP_URL });
    });
  }
}

// ---------------------------------------------------------------------------
// Single-instance lock — clicking the taskbar icon again focuses the
// existing window instead of launching a second shell.
// ---------------------------------------------------------------------------
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    log(`OPSQAI desktop shell starting. version=${app.getVersion()} log=${LOG_FILE}`);
    installCertificateHandler();
    createSplash();
    createMainWindow();
    // Hide main until splash + health pass.
    if (mainWindow) mainWindow.hide();
    createTray();
    loadSplashAndBoot();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
        loadSplashAndBoot();
      } else if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  });

  app.on("window-all-closed", () => {
    // Keep the tray running on Windows even after all windows close,
    // but if the user quits from the menu we do exit.
    if (process.platform !== "darwin") app.quit();
  });
}
