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
const { spawn } = require("child_process");

// The wizard is packaged inside %ProgramFiles%\OPSQAI\wizard\.
// Resolve installation root two levels up.
const installRoot = path.resolve(
  app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, "..", "..", "payload"),
  "..",
);
const nodeExe = path.join(installRoot, "runtime", "node", "node.exe");
const bootstrap = path.join(installRoot, "services", "bootstrap", "init.js");

let win;

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
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
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
