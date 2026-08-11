// Local AI engine setup for OPSQAI Self-Hosted (Ollama).
//
// Ollama is the single supported local AI runtime. The Windows setup binary
// is bundled in the installer payload (vendor\ollama\OllamaSetup.exe); the
// models are pulled from the internet during setup. After setup, everything
// runs on 127.0.0.1 with no external network access and no API key.
//
// This module never reports success it did not verify: every stage performs a
// real request against the local Ollama API.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawnSync, spawn } = require("node:child_process");

const DEFAULT_BASE = "http://127.0.0.1:11434";

class AiSetupError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function baseUrl(cfg) {
  return (cfg && (cfg.baseUrl || cfg.base_url)) || DEFAULT_BASE;
}

function ollamaExe() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Ollama", "ollama.exe"),
    path.join(process.env.ProgramFiles || "C:\\Program Files", "Ollama", "ollama.exe"),
    "C:\\Program Files\\Ollama\\ollama.exe",
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  const which = spawnSync("where", ["ollama.exe"], { encoding: "utf8", windowsHide: true });
  if (which.status === 0) {
    const first = (which.stdout || "").split(/\r?\n/).find((l) => l.trim());
    if (first && fs.existsSync(first.trim())) return first.trim();
  }
  return null;
}

function httpJson(url, { method = "GET", body = null, timeout = 20_000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        timeout,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if ((res.statusCode || 0) >= 400) {
            reject(new Error(`${url} -> ${res.statusCode}: ${data.slice(0, 300)}`));
            return;
          }
          try {
            resolve(JSON.parse(data || "{}"));
          } catch (e) {
            reject(new Error(`${url} -> invalid JSON: ${e.message}`));
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error(`${url} timed out after ${timeout}ms`)));
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/** 1. Install the bundled Ollama runtime when it is not present. */
function ensureInstalled(log, setupExe) {
  const existing = ollamaExe();
  if (existing) {
    log(`ollama runtime already installed: ${existing}`);
    return { exe: existing, installedNow: false };
  }
  if (!setupExe || !fs.existsSync(setupExe)) {
    throw new AiSetupError(
      "OPSQAI-E1501",
      `Ollama is not installed and the bundled setup was not found at ${setupExe || "(unset)"}`,
    );
  }
  log(`ollama runtime not found; installing from ${setupExe}`);
  const startedAt = Date.now();
  const r = spawnSync(setupExe, ["/allusers", "/silent"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 15 * 60_000,
  });
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  if (r.status !== 0) {
    throw new AiSetupError(
      "OPSQAI-E1501",
      `Ollama setup exited with ${r.status} after ${elapsed}s: ${(r.stderr || r.stdout || "").slice(0, 300)}`,
    );
  }
  const found = ollamaExe();
  if (!found) {
    throw new AiSetupError("OPSQAI-E1501", "Ollama setup completed but ollama.exe was not found");
  }
  log(`ollama runtime installed at ${found} in ${elapsed}s`);
  return { exe: found, installedNow: true };
}

/** 2. Start the runtime and wait for the local API to answer. */
async function ensureRunning(log, exe, cfg, timeoutMs = 120_000) {
  const base = baseUrl(cfg);
  const deadline = Date.now() + timeoutMs;
  let started = false;

  while (Date.now() < deadline) {
    try {
      await httpJson(`${base}/api/tags`, { timeout: 5_000 });
      log(`ollama API reachable at ${base}`);
      return;
    } catch (e) {
      if (!started) {
        started = true;
        log("starting ollama serve");
        try {
          const child = spawn(exe, ["serve"], {
            detached: true,
            stdio: "ignore",
            windowsHide: true,
          });
          child.unref();
        } catch (spawnErr) {
          throw new AiSetupError(
            "OPSQAI-E1502",
            `failed to start Ollama: ${spawnErr.message}`,
          );
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new AiSetupError(
    "OPSQAI-E1503",
    `Ollama API did not answer at ${base} within ${Math.round(timeoutMs / 1000)}s`,
  );
}

async function listModels(cfg) {
  const json = await httpJson(`${baseUrl(cfg)}/api/tags`, { timeout: 10_000 });
  return (json.models || []).map((m) => m.name || m.model || "").filter(Boolean);
}

function hasModel(tags, wanted) {
  const w = String(wanted).toLowerCase();
  return tags.some((t) => {
    const tag = t.toLowerCase();
    return tag === w || tag === `${w}:latest` || tag.split(":")[0] === w.split(":")[0];
  });
}

/** 3./4. Pull a model with streamed progress, if it is not already present. */
function pullModel(log, exe, model) {
  return new Promise((resolve, reject) => {
    log(`pulling model ${model} (this downloads several GB on first install)`);
    const child = spawn(exe, ["pull", model], { windowsHide: true });
    let lastPct = -1;
    let tail = "";
    const onData = (buf) => {
      const text = buf.toString();
      tail = (tail + text).slice(-500);
      const m = [...text.matchAll(/(\d{1,3})%/g)].pop();
      if (m) {
        const pct = Number(m[1]);
        if (pct !== lastPct && pct % 5 === 0) {
          lastPct = pct;
          log(`model ${model}: ${pct}%`);
        }
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", (e) =>
      reject(new AiSetupError("OPSQAI-E1504", `pull ${model} failed to start: ${e.message}`)),
    );
    child.on("close", (code) => {
      if (code === 0) {
        log(`model ${model} ready`);
        resolve();
      } else {
        reject(
          new AiSetupError(
            "OPSQAI-E1504",
            `pull ${model} exited with ${code}: ${tail.trim().slice(-300)}`,
          ),
        );
      }
    });
  });
}

/** 5./6. Probe the embedding model and return its ACTUAL vector length. */
async function probeEmbeddingDimension(cfg, model) {
  let json;
  try {
    json = await httpJson(`${baseUrl(cfg)}/v1/embeddings`, {
      method: "POST",
      body: { model, input: ["opsqai dimension probe"] },
      timeout: 120_000,
    });
  } catch (e) {
    throw new AiSetupError("OPSQAI-E1507", `embedding probe failed: ${e.message}`);
  }
  const dim = ((json.data || [])[0] || {}).embedding;
  if (!Array.isArray(dim) || dim.length === 0) {
    throw new AiSetupError("OPSQAI-E1507", `embedding model ${model} returned no vector`);
  }
  return dim.length;
}

/** 7. Real chat completion against the local engine. */
async function chatTest(cfg, model) {
  let json;
  try {
    json = await httpJson(`${baseUrl(cfg)}/v1/chat/completions`, {
      method: "POST",
      body: {
        model,
        messages: [{ role: "user", content: "Reply with the single word: ready" }],
        max_tokens: 8,
        stream: false,
      },
      timeout: 180_000,
    });
  } catch (e) {
    throw new AiSetupError("OPSQAI-E1506", `chat test failed: ${e.message}`);
  }
  const text = (((json.choices || [])[0] || {}).message || {}).content || "";
  if (!String(text).trim()) {
    throw new AiSetupError("OPSQAI-E1506", "chat test returned an empty completion");
  }
  return String(text).trim();
}

/**
 * Full fresh-install sequence. `deps.stage` reports a sub-stage to the wizard,
 * `deps.log` writes to the bootstrap log, `deps.applyDim(dim)` pins the probed
 * dimension in PostgreSQL (pgvector column + retrieval functions).
 */
async function setupAiEngine(deps) {
  const { log, stage, cfg, setupExe, applyDim } = deps;
  const models = {
    chat: cfg.chatModel || cfg.chat_model || "qwen2.5:7b",
    fast: cfg.chatFastModel || cfg.chat_fast_model || "qwen2.5:3b",
    embedding: cfg.embeddingModel || cfg.embedding_model || "bge-m3",
  };

  const aiStartedAt = Date.now();
  stage("ai engine: installing Ollama runtime");
  const { exe, installedNow } = ensureInstalled(log, setupExe);

  stage("ai engine: starting local runtime");
  await ensureRunning(log, exe, cfg);

  let tags = await listModels(cfg);
  log(`ollama has ${tags.length} model tag(s) present`);

  stage("ai engine: downloading chat model");
  if (!hasModel(tags, models.chat)) {
    await pullModel(log, exe, models.chat);
  } else {
    log(`chat model ${models.chat} already present — skipping pull`);
  }
  if (models.fast && models.fast !== models.chat) {
    if (!hasModel(tags, models.fast)) {
      await pullModel(log, exe, models.fast);
    } else {
      log(`fast chat model ${models.fast} already present — skipping pull`);
    }
  }

  stage("ai engine: downloading embedding model");
  if (!hasModel(tags, models.embedding)) {
    await pullModel(log, exe, models.embedding);
  } else {
    log(`embedding model ${models.embedding} already present — skipping pull`);
  }

  stage("ai engine: verifying models");
  tags = await listModels(cfg);
  for (const [role, name] of Object.entries(models)) {
    if (name && !hasModel(tags, name)) {
      throw new AiSetupError("OPSQAI-E1504", `${role} model ${name} is not installed after pull`);
    }
    log(`model verification ok: ${role}=${name}`);
  }

  stage("ai engine: probing embedding dimension");
  const dim = await probeEmbeddingDimension(cfg, models.embedding);
  log(`embedding model ${models.embedding} returns ${dim} dimensions`);

  stage("ai engine: configuring vector storage");
  await applyDim(dim);
  log(`vector storage pinned to embedding dimension ${dim}`);

  stage("ai engine: chat health check");
  const reply = await chatTest(cfg, models.chat);
  log(`chat test ok: ${reply.slice(0, 60)}`);

  stage("ai engine: embedding health check");
  const confirmDim = await probeEmbeddingDimension(cfg, models.embedding);
  if (confirmDim !== dim) {
    throw new AiSetupError(
      "OPSQAI-E1505",
      `embedding dimension is unstable (${dim} then ${confirmDim})`,
    );
  }
  log(`embedding health check ok (${confirmDim} dims)`);

  stage("ai engine ready");
  const totalAiSeconds = ((Date.now() - aiStartedAt) / 1000).toFixed(1);
  log(
    `ai engine summary: provider=ollama runtime=${installedNow ? "installed-now" : "already-present"} ` +
      `chat=${models.chat} fast=${models.fast || "(none)"} embedding=${models.embedding} dim=${dim} ` +
      `elapsed=${totalAiSeconds}s`,
  );
  return {
    provider: "ollama",
    baseUrl: baseUrl(cfg),
    chatModel: models.chat,
    chatFastModel: models.fast,
    embeddingModel: models.embedding,
    embeddingDim: dim,
  };
}

module.exports = {
  AiSetupError,
  setupAiEngine,
  ensureInstalled,
  ensureRunning,
  listModels,
  hasModel,
  pullModel,
  probeEmbeddingDimension,
  chatTest,
  DEFAULT_BASE,
};
