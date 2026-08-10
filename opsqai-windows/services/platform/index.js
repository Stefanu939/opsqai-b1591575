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


// Maps config.json `ai` block to environment variables.
//
// Default (and only supported standard local case): Ollama. No API key is
// ever emitted for it, and Cloud/gateway variables stay unset so a local
// install can never reach an external AI endpoint.
function aiEnv(cfg) {
  const ai = cfg.ai || {};
  const provider = ai.provider || "ollama";
  const dim = Number(ai.embeddingDim || ai.embedding_dim || 0);
  const base = {
    OPSQAI_EMBEDDING_DIM: dim > 0 ? String(dim) : "",
  };

  if (provider === "none") return { ...base, AI_PROVIDER: "" };

  if (provider === "ollama") {
    return {
      ...base,
      AI_PROVIDER: "ollama",
      OLLAMA_BASE_URL: ai.baseUrl || ai.base_url || "http://127.0.0.1:11434",
      OLLAMA_CHAT_MODEL: ai.chatModel || ai.chat_model || "qwen2.5:7b",
      OLLAMA_CHAT_FAST_MODEL: ai.chatFastModel || ai.chat_fast_model || "qwen2.5:3b",
      OLLAMA_EMBEDDING_MODEL: ai.embeddingModel || ai.embedding_model || "bge-m3",
    };
  }

  if (provider === "azure") {
    return {
      ...base,
      AI_PROVIDER: "azure",
      AZURE_OPENAI_RESOURCE_NAME: ai.resourceName || ai.resource_name || "",
      AZURE_OPENAI_API_KEY: ai.apiKey || ai.api_key || "",
      AZURE_OPENAI_API_VERSION: ai.apiVersion || ai.api_version || "2024-10-21",
      AZURE_OPENAI_CHAT_DEPLOYMENT: ai.chatModel || ai.chat_model || "gpt-4o",
      AZURE_OPENAI_CHAT_FAST_DEPLOYMENT: ai.chatFastModel || ai.chat_fast_model || "gpt-4o-mini",
      AZURE_OPENAI_EMBEDDING_DEPLOYMENT:
        ai.embeddingModel || ai.embedding_model || "text-embedding-3-small",
    };
  }

  if (provider === "gateway") {
    return { ...base, AI_PROVIDER: "lovable", LOVABLE_API_KEY: ai.apiKey || ai.api_key || "" };
  }

  return {
    ...base,
    AI_PROVIDER: "openai-compatible",
    GENERIC_AI_BASE_URL: ai.baseUrl || ai.base_url || "",
    GENERIC_AI_API_KEY: ai.apiKey || ai.api_key || "",
    GENERIC_AI_CHAT_MODEL: ai.chatModel || ai.chat_model || "gpt-4o",
    GENERIC_AI_CHAT_FAST_MODEL: ai.chatFastModel || ai.chat_fast_model || "gpt-4o-mini",
    GENERIC_AI_EMBEDDING_MODEL: ai.embeddingModel || ai.embedding_model || "text-embedding-3-small",
  };
}

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
  OPSQAI_TENANT_NAME: cfg.company?.name || "OPSQAI",

  // --- Local AI engine (Ollama) ---------------------------------------
  // Self-Hosted runs Ollama on this machine and needs no API key. The
  // legacy cloud/enterprise providers are only emitted when a customer
  // explicitly configured one (Enterprise BYO-provider path).
  ...aiEnv(cfg),

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
