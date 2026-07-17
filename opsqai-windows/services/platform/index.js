// OpsqaiPlatform — runs the OPSQAI web application (the TanStack Start
// server bundle staged at %ProgramFiles%\OPSQAI\app\server\index.mjs).
// Caddy sits in front on :443 and proxies to us on 127.0.0.1:APP_PORT.

"use strict";
const { spawn } = require("child_process");
const path = require("path");
const { loadConfig, programFiles } = require("../common/config");

const cfg = loadConfig();
const appEntry = programFiles("app", "server", "index.mjs");
const appPort = Number(process.env.OPSQAI_APP_PORT || 3000);

function buildDatabaseUrl() {
  if (cfg.database.mode === "embedded") {
    const p = cfg.database.embedded.port || 55432;
    const pw = cfg.database.embedded.password || "";
    const auth = pw ? `opsqai:${encodeURIComponent(pw)}` : "opsqai";
    return `postgres://${auth}@127.0.0.1:${p}/opsqai`;
  }
  const e = cfg.database.external;
  const auth = encodeURIComponent(e.username) + ":" + encodeURIComponent(e.password);
  return `postgres://${auth}@${e.host}:${e.port}/${e.database}`;
}

const programData = process.env.ProgramData || "C:\\ProgramData";
const opsqaiData = path.join(programData, "OPSQAI");

const env = {
  ...process.env,
  NODE_ENV: "production",
  PORT: String(appPort),
  HOST: "127.0.0.1",
  DATABASE_URL: buildDatabaseUrl(),

  // --- Platform mode --------------------------------------------------
  OPSQAI_PLATFORM_MODE: "selfhost",
  OPSQAI_DEPLOYMENT_TYPE: "SelfHosted",
  OPSQAI_EDITION: cfg.license?.edition || "community",
  OPSQAI_INSTALL_ID: cfg.installId || "",

  // --- Filesystem layout (all under %ProgramData%\OPSQAI\) ------------
  OPSQAI_CONFIG_DIR: path.join(opsqaiData, "config"),
  OPSQAI_STORAGE_LOCAL_PATH:
    cfg.storage?.local?.path || path.join(opsqaiData, "storage"),
  OPSQAI_BACKUP_DIR: path.join(opsqaiData, "backups"),
  OPSQAI_LOG_DIR: path.join(opsqaiData, "logs"),

  // --- Crypto keys (populated by the installer's first-run step) ------
  OPSQAI_JWT_PRIVATE_KEY_PATH:
    process.env.OPSQAI_JWT_PRIVATE_KEY_PATH ||
    path.join(opsqaiData, "config", "keys", "jwt-signing.key"),
  OPSQAI_JWT_PUBLIC_KEY_PATH:
    process.env.OPSQAI_JWT_PUBLIC_KEY_PATH ||
    path.join(opsqaiData, "config", "keys", "jwt-signing.pub"),
  OPSQAI_LICENSE_PUBLIC_KEY_PATH:
    process.env.OPSQAI_LICENSE_PUBLIC_KEY_PATH ||
    path.join(opsqaiData, "config", "keys", "license-verify.pub"),
  OPSQAI_LICENSE_FILE_PATH:
    process.env.OPSQAI_LICENSE_FILE_PATH ||
    path.join(opsqaiData, "config", "license.opsqai"),
  OPSQAI_CIPHER_MODE: process.env.OPSQAI_CIPHER_MODE || "dpapi",

  // --- Optional integrations ------------------------------------------
  OPSQAI_PG_DUMP_PATH: process.env.OPSQAI_PG_DUMP_PATH || "",
  OPSQAI_HEARTBEAT_URL: cfg.licensing?.heartbeatUrl || "",
  OPSQAI_TELEMETRY_LEVEL: cfg.telemetry?.level || "anonymous",

  // --- SMTP (only set when configured in the installer) ---------------
  OPSQAI_SMTP_HOST: cfg.smtp?.host || "",
  OPSQAI_SMTP_PORT: cfg.smtp?.port ? String(cfg.smtp.port) : "",
  OPSQAI_SMTP_SECURE: cfg.smtp?.secure ? "true" : "false",
  OPSQAI_SMTP_USER: cfg.smtp?.username || "",
  OPSQAI_SMTP_PASSWORD: cfg.smtp?.password || "",
  OPSQAI_SMTP_FROM: cfg.smtp?.fromAddress || "",
  OPSQAI_SMTP_FROM_NAME: cfg.smtp?.fromName || "",
};

console.log(`[platform] Launching app on 127.0.0.1:${appPort}`);
const node = process.execPath; // bundled Node
const child = spawn(node, [appEntry], { env, stdio: "inherit" });

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    try {
      child.kill("SIGTERM");
    } catch {}
  });
}
child.on("exit", (code) => {
  console.log(`[platform] app exited ${code}`);
  process.exit(code ?? 1);
});
