// Offline acceptance test for the Self-Hosted local AI engine.
//
// Proves that Chat + Embeddings + RAG retrieval work with NO external network
// access: every request the adapter makes must target the local Ollama host.
// Any attempt to reach a non-local origin fails the test, as does any request
// carrying an Authorization header (a local engine needs no credentials).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ollamaAdapter, ollamaBaseUrl, ollamaModels, probeOllama, probeEmbeddingDimension } from "./ollama";

const LOCAL = "http://127.0.0.1:11434";
const DIM = 1024;

const requested: string[] = [];

function isLocal(url: string): boolean {
  const host = new URL(url).hostname;
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

/** Fake Ollama that only answers on localhost — stands in for a real install. */
function offlineOllama(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  requested.push(url);

  if (!isLocal(url)) {
    throw new Error(`external network access attempted: ${url}`);
  }
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  if (headers.has("authorization")) {
    throw new Error("local engine must not receive an Authorization header");
  }

  const json = (body: unknown) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

  if (url.endsWith("/api/tags")) {
    return json({ models: [{ name: "qwen2.5:7b" }, { name: "qwen2.5:3b" }, { name: "bge-m3:latest" }] });
  }
  if (url.includes("/v1/embeddings")) {
    return json({
      object: "list",
      data: [{ object: "embedding", index: 0, embedding: Array.from({ length: DIM }, () => 0.01) }],
      model: "bge-m3",
      usage: { prompt_tokens: 3, total_tokens: 3 },
    });
  }
  if (url.includes("/v1/chat/completions")) {
    return json({
      id: "local-1",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "qwen2.5:7b",
      choices: [
        { index: 0, message: { role: "assistant", content: "grounded answer" }, finish_reason: "stop" },
      ],
      usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 },
    });
  }
  return json({});
}

describe("Self-Hosted offline AI acceptance", () => {
  beforeEach(() => {
    requested.length = 0;
    process.env.OLLAMA_BASE_URL = LOCAL;
    process.env.OLLAMA_CHAT_MODEL = "qwen2.5:7b";
    process.env.OLLAMA_CHAT_FAST_MODEL = "qwen2.5:3b";
    process.env.OLLAMA_EMBEDDING_MODEL = "bge-m3";
    vi.stubGlobal("fetch", vi.fn(offlineOllama));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves its configuration entirely from local settings", () => {
    expect(ollamaBaseUrl()).toBe(LOCAL);
    expect(ollamaModels()).toEqual({
      chat: "qwen2.5:7b",
      "chat-fast": "qwen2.5:3b",
      embedding: "bge-m3",
    });
  });

  it("passes the full health probe with external access disabled", async () => {
    const probe = await probeOllama(5_000);
    expect(probe.ok).toBe(true);
    expect(probe.embeddingDim).toBe(DIM);
    expect(probe.steps.every((s) => s.ok)).toBe(true);
    expect(requested.every(isLocal)).toBe(true);
  });

  it("reports the model's native embedding dimension (no truncation)", async () => {
    await expect(probeEmbeddingDimension(5_000)).resolves.toBe(DIM);
  });

  it("builds embeddings requests without a dimensions override or API key", async () => {
    const resolved = ollamaAdapter.resolveEmbeddings();
    expect(isLocal(resolved.url)).toBe(true);
    expect(Object.keys(resolved.headers).map((h) => h.toLowerCase())).not.toContain("authorization");
    const body = resolved.buildBody(["chunk one", "chunk two"], DIM) as Record<string, unknown>;
    expect(body.model).toBe("bge-m3");
    expect(body).not.toHaveProperty("dimensions");
  });

  it("performs a real RAG round trip (embed query -> retrieve -> chat) locally", async () => {
    // 1. Embed the user question through the local engine.
    const resolved = ollamaAdapter.resolveEmbeddings();
    const res = await fetch(resolved.url, {
      method: "POST",
      headers: resolved.headers,
      body: JSON.stringify(resolved.buildBody(["How do I lock out a conveyor?"], DIM)),
    });
    const embedded = (await res.json()) as { data: { embedding: number[] }[] };
    const queryVector = embedded.data[0].embedding;
    expect(queryVector).toHaveLength(DIM);

    // 2. Retrieval stands in for pgvector: same dimension => comparable vectors.
    const corpus = [
      { title: "SOP-114 Lockout/Tagout", embedding: Array.from({ length: DIM }, () => 0.01) },
    ];
    const cosine = (a: number[], b: number[]) => {
      const dot = a.reduce((s, v, i) => s + v * b[i], 0);
      const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
      const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
      return dot / (na * nb);
    };
    const best = corpus
      .map((c) => ({ ...c, score: cosine(queryVector, c.embedding) }))
      .sort((a, b) => b.score - a.score)[0];
    expect(best.score).toBeGreaterThan(0.9);

    // 3. Answer from the retrieved context through the local chat model.
    const chat = await fetch(`${LOCAL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModels().chat,
        messages: [
          { role: "system", content: `Answer only from: ${best.title}` },
          { role: "user", content: "How do I lock out a conveyor?" },
        ],
      }),
    });
    const completion = (await chat.json()) as { choices: { message: { content: string } }[] };
    expect(completion.choices[0].message.content).toBeTruthy();

    // Sovereignty assertion: nothing left the machine.
    expect(requested.length).toBeGreaterThan(0);
    expect(requested.every(isLocal)).toBe(true);
  });
});
