// Local AI engine setup for OPSQAI Self-Hosted (llama.cpp — default engine).
//
// llama-server.exe is bundled in the payload (vendor\llamacpp) with a SHA-256
// sidecar written at build time. Models are single GGUF files downloaded once
// during setup into %ProgramData%\OPSQAI\models. The OpsqaiAi service then
// serves chat + embeddings on 127.0.0.1:11440 (OpenAI-compatible). After
// setup everything runs offline with no API key.
//
// Same contract as ollama.cjs: every stage is verified with a real request.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const crypto = require("node:crypto");
const { AiSetupError, probeEmbeddingDimension, chatTest } = require("./ollama.cjs");

const GATEWAY = "http://127.0.0.1:11440";

/** Model catalog. `office` = low RAM default, `server` = higher quality. */
const MODEL_CATALOG = {
  "qwen2.5:3b": {
    file: "qwen2.5-3b-instruct-q4_k_m.gguf",
    url: "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf",
  },
  "qwen2.5:1.5b": {
    file: "qwen2.5-1.5b-instruct-q4_k_m.gguf",
    url: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf",
  },
  "qwen2.5:7b": {
    file: "Qwen2.5-7B-Instruct-Q4_K_M.gguf",
    url: "https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf",
  },
  "bge-m3": {
    file: "bge-m3-Q8_0.gguf",
    url: "https://huggingface.co/gpustack/bge-m3-GGUF/resolve/main/bge-m3-Q8_0.gguf",
  },
};

function resolveModel(name, explicitUrl) {
  if (explicitUrl) return { file: path.basename(new URL(explicitUrl).pathname), url: explicitUrl };
  const m = MODEL_CATALOG[name];
  if (!m) {
    throw new AiSetupError(
      "OPSQAI-E1504",
      `Unknown llama.cpp model "${name}". Use one of: ${Object.keys(MODEL_CATALOG).join(", ")}`,
    );
  }
  return m;
}

function verifyRuntime(log, exe) {
  if (!fs.existsSync(exe)) {
    throw new AiSetupError("OPSQAI-E1501", `Bundled AI engine not found at ${exe}`);
  }
  const sidecar = `${exe}.sha256`;
  if (!fs.existsSync(sidecar)) {
    throw new AiSetupError("OPSQAI-E1501", `Missing integrity file for the bundled AI engine: ${sidecar}`);
  }
  const expected = fs.readFileSync(sidecar, "utf8").trim().toLowerCase();
  const actual = crypto.createHash("sha256").update(fs.readFileSync(exe)).digest("hex");
  if (!expected || actual !== expected) {
    throw new AiSetupError(
      "OPSQAI-E1501",
      `Bundled AI engine failed integrity check (expected ${expected || "(empty)"}, got ${actual})`,
    );
  }
  log(`llama.cpp runtime integrity verified (sha256 ${actual.slice(0, 12)}…)`);
}

/** Download with redirects, streamed progress and atomic rename. */
function download(log, url, dest, label, redirects = 0) {
  return new Promise((resolve, reject) => {
    const tmp = `${dest}.part`;
    const req = https.get(url, { headers: { "User-Agent": "OPSQAI-Installer" }, timeout: 60_000 }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
        res.resume();
        if (redirects > 8) return reject(new AiSetupError("OPSQAI-E1504", `too many redirects for ${label}`));
        const next = new URL(res.headers.location, url).toString();
        return resolve(download(log, next, dest, label, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new AiSetupError("OPSQAI-E1504", `download ${label} failed: HTTP ${res.statusCode}`));
      }
      const total = Number(res.headers["content-length"] || 0);
      let got = 0;
      let lastPct = -1;
      const out = fs.createWriteStream(tmp);
      res.on("data", (c) => {
        got += c.length;
        if (total) {
          const pct = Math.floor((got / total) * 100);
          if (pct !== lastPct && pct % 5 === 0) {
            lastPct = pct;
            log(`model ${label}: ${pct}%`);
          }
        }
      });
      res.pipe(out);
      out.on("finish", () => {
        out.close(() => {
          if (total && got !== total) {
            fs.rmSync(tmp, { force: true });
            return reject(new AiSetupError("OPSQAI-E1504", `download ${label} truncated (${got}/${total} bytes)`));
          }
          fs.renameSync(tmp, dest);
          resolve();
        });
      });
      out.on("error", (e) => reject(new AiSetupError("OPSQAI-E1504", `writing ${label}: ${e.message}`)));
    });
    req.on("timeout", () => req.destroy(new Error("connection timed out")));
    req.on("error", (e) => reject(new AiSetupError("OPSQAI-E1504", `download ${label} failed: ${e.message}`)));
  });
}

async function ensureModel(log, modelsDir, name, explicitUrl) {
  const m = resolveModel(name, explicitUrl);
  const dest = path.join(modelsDir, m.file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1_000_000) {
    log(`model ${name} already present (${m.file}) — skipping download`);
    return m.file;
  }
  log(`downloading model ${name} (${m.file}) — one-time download`);
  await download(log, m.url, dest, name);
  // GGUF magic check: a proxy error page must never be served as a model.
  const fd = fs.openSync(dest, "r");
  const magic = Buffer.alloc(4);
  fs.readSync(fd, magic, 0, 4, 0);
  fs.closeSync(fd);
  if (magic.toString("ascii") !== "GGUF") {
    fs.rmSync(dest, { force: true });
    throw new AiSetupError("OPSQAI-E1504", `downloaded ${name} is not a valid GGUF model`);
  }
  log(`model ${name} ready`);
  return m.file;
}

async function waitHealthy(log, timeoutMs = 300_000) {
  const http = require("node:http");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const r = http.get(`${GATEWAY}/health`, { timeout: 4000 }, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      r.on("error", () => resolve(false));
      r.on("timeout", () => r.destroy());
    });
    if (ok) {
      log(`llama.cpp engine healthy at ${GATEWAY}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new AiSetupError("OPSQAI-E1503", `local AI engine did not become healthy within ${timeoutMs / 1000}s`);
}

/**
 * deps: { log, stage, cfg, exe, modelsDir, startService(), saveAi(partial), applyDim(dim) }
 */
async function setupLlamaEngine(deps) {
  const { log, stage, cfg, exe, modelsDir, startService, saveAi, applyDim } = deps;
  const startedAt = Date.now();
  const models = {
    chat: cfg.chatModel || "qwen2.5:3b",
    embedding: cfg.embeddingModel || "bge-m3",
  };

  stage("ai engine: installing llama.cpp runtime");
  verifyRuntime(log, exe);
  fs.mkdirSync(modelsDir, { recursive: true });

  stage("ai engine: downloading chat model");
  const chatModelFile = await ensureModel(log, modelsDir, models.chat, cfg.chatModelUrl);

  stage("ai engine: downloading embedding model");
  const embeddingModelFile = await ensureModel(log, modelsDir, models.embedding, cfg.embeddingModelUrl);

  // The service reads these from config.json, so persist before starting it.
  saveAi({ provider: "llamacpp", modelsDir, chatModelFile, embeddingModelFile });

  stage("ai engine: starting local runtime");
  startService();
  await waitHealthy(log);

  const probeCfg = { baseUrl: GATEWAY };
  stage("ai engine: probing embedding dimension");
  const dim = await probeEmbeddingDimension(probeCfg, models.embedding);
  log(`embedding model ${models.embedding} returns ${dim} dimensions`);

  stage("ai engine: configuring vector storage");
  await applyDim(dim);

  stage("ai engine: chat health check");
  const reply = await chatTest(probeCfg, models.chat);
  log(`chat test ok: ${reply.slice(0, 60)}`);

  stage("ai engine: embedding health check");
  const again = await probeEmbeddingDimension(probeCfg, models.embedding);
  if (again !== dim) {
    throw new AiSetupError("OPSQAI-E1505", `embedding dimension is unstable (${dim} then ${again})`);
  }

  stage("ai engine ready");
  log(
    `ai engine summary: provider=llamacpp chat=${models.chat} embedding=${models.embedding} dim=${dim} ` +
      `elapsed=${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
  );
  return {
    provider: "llamacpp",
    baseUrl: `${GATEWAY}/v1`,
    apiKey: "local",
    chatModel: models.chat,
    chatFastModel: models.chat,
    embeddingModel: models.embedding,
    embeddingDim: dim,
    modelsDir,
    chatModelFile,
    embeddingModelFile,
  };
}

module.exports = { setupLlamaEngine, MODEL_CATALOG, resolveModel, GATEWAY };
