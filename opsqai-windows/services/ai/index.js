// OpsqaiAi — local AI engine supervisor (llama.cpp).
//
// Runs two llama-server.exe processes on loopback only:
//   chat      -> 127.0.0.1:11441  (chat + fast role share one model, saves RAM)
//   embedding -> 127.0.0.1:11442  (--embedding)
// and exposes ONE OpenAI-compatible endpoint on 127.0.0.1:11440 that routes
// /v1/embeddings to the embedding server and everything else to chat. The app
// therefore talks to a single base URL (http://127.0.0.1:11440/v1).
//
// Crashed children are restarted with back-off; WinSW restarts this
// supervisor itself. Nothing listens on a non-loopback interface.

"use strict";
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { loadConfig } = require("../common/config");

const GATEWAY_PORT = 11440;
const CHAT_PORT = 11441;
const EMBED_PORT = 11442;

function log(...a) {
  console.log(new Date().toISOString(), "[ai]", ...a);
}

const cfg = loadConfig();
const ai = (cfg && cfg.ai) || {};
if (ai.provider !== "llamacpp") {
  log(`provider is "${ai.provider || "(unset)"}" — llama.cpp supervisor idle`);
  setInterval(() => {}, 1 << 30);
  return;
}

const installRoot = path.resolve(__dirname, "..", "..");
const exe = path.join(installRoot, "vendor", "llamacpp", "llama-server.exe");
const modelsDir = ai.modelsDir || path.join(process.env.ProgramData || "C:\\ProgramData", "OPSQAI", "models");
const threads = String(Math.max(2, Number(ai.threads) || require("node:os").cpus().length - 1));
const ctx = String(Number(ai.contextSize) || 8192);

function modelPath(file) {
  return path.isAbsolute(file) ? file : path.join(modelsDir, file);
}

const children = {};
function run(name, port, args) {
  let delay = 2000;
  const start = () => {
    if (!fs.existsSync(exe)) {
      log(`llama-server.exe missing at ${exe}`);
      process.exit(2);
    }
    log(`starting ${name} on 127.0.0.1:${port}`);
    const child = spawn(exe, ["--host", "127.0.0.1", "--port", String(port), "-t", threads, ...args], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    children[name] = child;
    const pipe = (b) => process.stdout.write(`[${name}] ${b}`);
    child.stdout.on("data", pipe);
    child.stderr.on("data", pipe);
    const t0 = Date.now();
    child.on("exit", (code) => {
      log(`${name} exited with ${code}; restarting in ${delay / 1000}s`);
      if (Date.now() - t0 > 60_000) delay = 2000;
      setTimeout(start, delay);
      delay = Math.min(delay * 2, 60_000);
    });
  };
  start();
}

run("chat", CHAT_PORT, ["-m", modelPath(ai.chatModelFile), "-c", ctx, "--alias", ai.chatModel || "chat"]);
run("embedding", EMBED_PORT, [
  "-m", modelPath(ai.embeddingModelFile),
  "--embedding", "--pooling", "cls", "-c", "8192", "-ub", "8192",
  "--alias", ai.embeddingModel || "embedding",
]);

const server = http.createServer((req, res) => {
  const p = (req.url || "").split("?")[0];
  if (p === "/health") {
    Promise.all([CHAT_PORT, EMBED_PORT].map(probe)).then((r) => {
      const ok = r.every(Boolean);
      res.writeHead(ok ? 200 : 503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: ok ? "ok" : "loading", chat: r[0], embedding: r[1] }));
    });
    return;
  }
  const port = /\/embeddings$/.test(p) ? EMBED_PORT : CHAT_PORT;
  const up = http.request(
    { host: "127.0.0.1", port, path: req.url, method: req.method, headers: req.headers },
    (u) => {
      res.writeHead(u.statusCode || 502, u.headers);
      u.pipe(res);
    },
  );
  up.on("error", (e) => {
    if (!res.headersSent) res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: `local AI engine not ready: ${e.message}` } }));
  });
  req.pipe(up);
  res.on("close", () => up.destroy());
});

function probe(port) {
  return new Promise((resolve) => {
    const r = http.get({ host: "127.0.0.1", port, path: "/health", timeout: 3000 }, (x) => {
      x.resume();
      resolve(x.statusCode === 200);
    });
    r.on("error", () => resolve(false));
    r.on("timeout", () => r.destroy());
  });
}

server.listen(GATEWAY_PORT, "127.0.0.1", () => log(`gateway listening on 127.0.0.1:${GATEWAY_PORT}`));

function shutdown() {
  for (const c of Object.values(children)) {
    c.removeAllListeners("exit");
    try { c.kill(); } catch {}
  }
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
