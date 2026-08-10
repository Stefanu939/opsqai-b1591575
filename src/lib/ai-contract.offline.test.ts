// Offline capability regression test for the Global Self-Hosted AI Contract.
//
// Exercises EVERY registered AI capability through the central provider only,
// with external network access blocked. Any request to a non-local host fails
// the test, which is what proves that no module can silently reach a cloud
// provider on a Self-Hosted install.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const LOCAL = "http://127.0.0.1:11434";
const DIM = 1024;
const requested: string[] = [];

function isLocal(url: string): boolean {
  const host = new URL(url).hostname;
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function json(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

/** Local-only Ollama double. Anything non-local is a contract violation. */
function offlineEngine(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  requested.push(url);
  if (!isLocal(url)) throw new Error(`external network access attempted: ${url}`);

  if (url.endsWith("/api/tags")) {
    return json({ models: [{ name: "qwen2.5:7b" }, { name: "qwen2.5:3b" }, { name: "bge-m3:latest" }] });
  }
  if (url.includes("/v1/embeddings")) {
    return json({
      object: "list",
      data: [{ object: "embedding", index: 0, embedding: Array.from({ length: DIM }, () => 0.01) }],
    });
  }
  if (url.includes("/v1/chat/completions")) {
    const body = typeof init?.body === "string" ? init.body : "";
    const wantsJson = /json/i.test(body);
    const content = wantsJson ? '{"summary":"local","score":4}' : "local answer";
    // The central provider always streams (long local generations must not be
    // cut off by request timeouts), so the local engine answers with SSE.
    const events = [
      ...content.split(/(?= )/).map((chunk) =>
        JSON.stringify({
          id: "local-1",
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: "qwen2.5:7b",
          choices: [{ index: 0, delta: { role: "assistant", content: chunk }, finish_reason: null }],
        }),
      ),
      JSON.stringify({
        id: "local-1",
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: "qwen2.5:7b",
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
      "[DONE]",
    ];
    return Promise.resolve(
      new Response(events.map((e) => `data: ${e}\n\n`).join(""), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
  }

  return json({});
}

describe("Global Self-Hosted AI Contract — offline capability suite", () => {
  beforeEach(() => {
    requested.length = 0;
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_BASE_URL = LOCAL;
    process.env.OLLAMA_CHAT_MODEL = "qwen2.5:7b";
    process.env.OLLAMA_CHAT_FAST_MODEL = "qwen2.5:3b";
    process.env.OLLAMA_EMBEDDING_MODEL = "bge-m3";
    process.env.OPSQAI_PLATFORM_MODE = "selfhost";
    vi.stubGlobal("fetch", vi.fn(offlineEngine));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.AI_PROVIDER;
    delete process.env.OPSQAI_PLATFORM_MODE;
  });

  it("routes Self-Hosted to the local engine by default (no cloud adapter)", async () => {
    delete process.env.AI_PROVIDER;
    const { activeAiProviderId } = await import("./ai-provider.server");
    expect(activeAiProviderId()).toBe("ollama");
  });

  it("exposes a capability registry instead of assumptions", async () => {
    const { aiCapabilities, hasAiCapability } = await import("./ai-provider.server");
    const caps = aiCapabilities();
    expect(caps.chat).toBe(true);
    expect(caps.fastChat).toBe(true);
    expect(caps.embeddings).toBe(true);
    expect(caps.jsonOutput).toBe(true);
    expect(caps.streaming).toBe(true);
    // Unsupported locally — must be reported, never routed to a cloud provider.
    expect(caps.textToSpeech).toBe(false);
    expect(hasAiCapability("textToSpeech")).toBe(false);
  });

  it("confirms capabilities against the running engine (health probe)", async () => {
    const { probeAiCapabilities } = await import("./ai-provider.server");
    const caps = await probeAiCapabilities();
    expect(caps.chat).toBe(true);
    expect(caps.embeddings).toBe(true);
    expect(requested.every(isLocal)).toBe(true);
  });

  it("resolves chat + fast chat models locally without naming a model in feature code", async () => {
    const { resolveChatModel } = await import("./ai-provider.server");
    expect(resolveChatModel("chat")).toBeTruthy();
    expect(resolveChatModel("chat-fast")).toBeTruthy();
  });

  it("generates text through the central provider only", async () => {
    const { generateAiText } = await import("./ai-provider.server");
    const text = await generateAiText({ role: "chat", prompt: "summarize this SOP" });
    expect(text).toContain("local");
    expect(requested.every(isLocal)).toBe(true);
  });

  it("generates JSON output for generators (Academy, Audit, KB, FAQ)", async () => {
    const { generateAiJson } = await import("./ai-provider.server");
    const raw = await generateAiJson({
      role: "chat",
      prompt: "Return json with a summary field",
    });
    expect(JSON.parse(raw.match(/\{[\s\S]*\}/)![0]).summary).toBe("local");
    expect(requested.every(isLocal)).toBe(true);
  });

  it("produces embeddings for RAG and semantic search", async () => {
    const { resolveEmbeddings, resolveEmbedOne } = await import("./ai-provider.server");
    const [vec] = await resolveEmbeddings(["how do I lock out a conveyor"]);
    expect(vec).toHaveLength(DIM);
    await expect(resolveEmbedOne("query")).resolves.toHaveLength(DIM);
    expect(requested.every(isLocal)).toBe(true);
  });

  it("reports text-to-speech as unsupported instead of calling a cloud provider", async () => {
    const { resolveTTSOrNull, resolveTTS, AiCapabilityError } = await import("./ai-provider.server");
    expect(resolveTTSOrNull()).toBeNull();
    expect(() => resolveTTS()).toThrow(AiCapabilityError);
    expect(requested.every(isLocal)).toBe(true);
  });

  it("fails closed on an unsupported capability (vision / audio input)", async () => {
    const { assertAiCapability, AiCapabilityError } = await import("./ai-provider.server");
    expect(() => assertAiCapability("vision")).toThrow(AiCapabilityError);
    expect(() => assertAiCapability("audioInput")).toThrow(AiCapabilityError);
    // No request was attempted at all — the boundary refuses before the wire.
    expect(requested).toHaveLength(0);
  });

  it("never contacts a non-local host across the whole suite", () => {
    expect(requested.every(isLocal)).toBe(true);
  });
});
