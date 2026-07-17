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
