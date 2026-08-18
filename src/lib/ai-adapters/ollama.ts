// Ollama adapter — the local AI engine for OPSQAI Self-Hosted.
//
// Ollama runs on the customer's own machine and needs NO authentication.
// This adapter therefore never sends an Authorization header and never
// invents a dummy API key. It is a dedicated adapter (not a reuse of the
// generic `openai-compatible` one) because its configuration surface, its
// health checks and its embedding-dimension semantics differ.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { AIChatRole, AIProviderAdapter, ResolvedEmbeddings, ResolvedTTS } from "./types";
import { OLLAMA_DEFAULT_BASE_URL, OLLAMA_DEFAULT_MODELS } from "./ollama-models";
import { capabilities, type AICapabilities } from "../ai-capabilities";

export function ollamaBaseUrl(): string {
  const raw = process.env.OLLAMA_BASE_URL?.trim() || OLLAMA_DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

/** OpenAI-compatible surface exposed by Ollama at `/v1`. */
function openaiBaseUrl(): string {
  return `${ollamaBaseUrl()}/v1`;
}

export function ollamaModels() {
  return {
    chat: process.env.OLLAMA_CHAT_MODEL?.trim() || OLLAMA_DEFAULT_MODELS.chat,
    "chat-fast": process.env.OLLAMA_CHAT_FAST_MODEL?.trim() || OLLAMA_DEFAULT_MODELS.chatFast,
    embedding: process.env.OLLAMA_EMBEDDING_MODEL?.trim() || OLLAMA_DEFAULT_MODELS.embedding,
  } as const;
}

/** Ollama has no dedicated STT/vision flag — models declare it by name. */
function isVisionModel(name: string): boolean {
  const n = name.toLowerCase();
  return /(llava|vision|minicpm-v|bakllava|moondream|qwen.?2(\.5)?-vl|llama3\.2-vision)/.test(n);
}

export const ollamaAdapter: AIProviderAdapter = {
  id: "ollama",
  local: true,
  aliases: ["ollama-local"],
  label: "Ollama — Local",
  // Declared capabilities of the local engine. `probeCapabilities()` below
  // confirms them against the models that are actually installed. Anything
  // Ollama cannot do stays false — it is NEVER routed to a cloud provider.
  capabilities: capabilities({
    chat: true,
    fastChat: true,
    embeddings: true,
    jsonOutput: true,
    structuredOutput: true,
    streaming: true,
    toolCalling: true,
  }),

  async probeCapabilities(): Promise<AICapabilities> {
    const probe = await probeOllama(15_000);
    const step = (id: OllamaProbeStep["id"]) => probe.steps.find((s) => s.id === id)?.ok === true;
    const chatOk = step("chat");
    const embedOk = step("embeddings");
    return capabilities({
      chat: chatOk,
      fastChat: chatOk,
      embeddings: embedOk,
      jsonOutput: chatOk,
      structuredOutput: chatOk,
      streaming: chatOk,
      toolCalling: chatOk,
      // Vision is model-dependent, not endpoint-dependent: only report it
      // when the installed chat model is actually multimodal. No cloud
      // fallback — a non-vision local model simply reports `false`.
      vision: chatOk && isVisionModel(ollamaModels().chat),
    });
  },

  resolveChat(role: AIChatRole): LanguageModel {
    // No apiKey: createOpenAICompatible omits the Authorization header when
    // none is provided, which is exactly what a local Ollama expects.
    const local = createOpenAICompatible({ name: "ollama", baseURL: openaiBaseUrl() });
    return local(ollamaModels()[role]);
  },

  resolveTTS(): ResolvedTTS {
    // Ollama has no /audio/speech endpoint. Reporting a fake endpoint here
    // would make the TTS route fail with an opaque 404 later.
    throw new Error(
      "Text-to-speech is not available on the local Ollama engine. " +
        "Speech features require a provider that exposes an audio endpoint.",
    );
  },

  resolveEmbeddings(): ResolvedEmbeddings {
    const model = ollamaModels().embedding;
    return {
      url: `${openaiBaseUrl()}/embeddings`,
      headers: { "Content-Type": "application/json" },
      // Deliberately no `dimensions`: the model's native vector length is
      // the source of truth and Ollama does not truncate on request.
      buildBody: (texts) => ({ model, input: texts }),
    };
  },
};

// ---------------------------------------------------------------------------
// Health probing
// ---------------------------------------------------------------------------

export interface OllamaProbeStep {
  id: "api" | "chat-model" | "embedding-model" | "chat" | "embeddings";
  label: string;
  ok: boolean;
  detail: string;
}

export interface OllamaProbeResult {
  ok: boolean;
  baseUrl: string;
  chatModel: string;
  chatFastModel: string;
  embeddingModel: string;
  /** Actual vector length returned by the embedding model, when reachable. */
  embeddingDim: number | null;
  steps: OllamaProbeStep[];
}

async function listTags(base: string, timeoutMs: number): Promise<string[]> {
  const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`/api/tags returned ${res.status}`);
  const json = (await res.json()) as { models?: { name?: string; model?: string }[] };
  return (json.models ?? []).map((m) => m.name ?? m.model ?? "").filter(Boolean);
}

function hasModel(tags: string[], wanted: string): boolean {
  const w = wanted.toLowerCase();
  const base = w.includes(":") ? w : `${w}:latest`;
  return tags.some((t) => {
    const tag = t.toLowerCase();
    return tag === w || tag === base || tag.split(":")[0] === w.split(":")[0];
  });
}

/**
 * Runs the real Ollama health sequence: API reachable, both models present,
 * a genuine chat completion, a genuine embedding call. Never reports success
 * without the underlying request succeeding.
 */
export async function probeOllama(timeoutMs = 60_000): Promise<OllamaProbeResult> {
  const base = ollamaBaseUrl();
  const models = ollamaModels();
  const steps: OllamaProbeStep[] = [];
  let embeddingDim: number | null = null;

  const push = (
    id: OllamaProbeStep["id"],
    label: string,
    ok: boolean,
    detail: string,
  ) => steps.push({ id, label, ok, detail });

  let tags: string[] = [];
  try {
    tags = await listTags(base, Math.min(timeoutMs, 10_000));
    push("api", "Ollama API", true, `${tags.length} model(s) installed`);
  } catch (e) {
    push("api", "Ollama API", false, (e as Error).message);
    return {
      ok: false,
      baseUrl: base,
      chatModel: models.chat,
      chatFastModel: models["chat-fast"],
      embeddingModel: models.embedding,
      embeddingDim: null,
      steps,
    };
  }

  const chatPresent = hasModel(tags, models.chat);
  push(
    "chat-model",
    "Chat model",
    chatPresent,
    chatPresent ? models.chat : `${models.chat} is not installed`,
  );
  const embedPresent = hasModel(tags, models.embedding);
  push(
    "embedding-model",
    "Embedding model",
    embedPresent,
    embedPresent ? models.embedding : `${models.embedding} is not installed`,
  );

  if (chatPresent) {
    try {
      const res = await fetch(`${base}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: models.chat,
          messages: [{ role: "user", content: "Reply with the single word: ready" }],
          max_tokens: 8,
          stream: false,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`chat returned ${res.status}`);
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) throw new Error("chat returned an empty completion");
      push("chat", "Chat completion", true, text.trim().slice(0, 40));
    } catch (e) {
      push("chat", "Chat completion", false, (e as Error).message);
    }
  } else {
    push("chat", "Chat completion", false, "skipped — chat model missing");
  }

  if (embedPresent) {
    try {
      const res = await fetch(`${base}/v1/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: models.embedding, input: ["opsqai health probe"] }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`embeddings returned ${res.status}`);
      const json = (await res.json()) as { data?: { embedding?: number[] }[] };
      const vec = json.data?.[0]?.embedding;
      if (!Array.isArray(vec) || vec.length === 0) {
        throw new Error("embeddings returned no vector");
      }
      embeddingDim = vec.length;
      push("embeddings", "Embeddings", true, `${vec.length} dimensions`);
    } catch (e) {
      push("embeddings", "Embeddings", false, (e as Error).message);
    }
  } else {
    push("embeddings", "Embeddings", false, "skipped — embedding model missing");
  }

  return {
    ok: steps.every((s) => s.ok),
    baseUrl: base,
    chatModel: models.chat,
    chatFastModel: models["chat-fast"],
    embeddingModel: models.embedding,
    embeddingDim,
    steps,
  };
}

/** Probes only the embedding model and returns its native vector length. */
export async function probeEmbeddingDimension(timeoutMs = 60_000): Promise<number> {
  const base = ollamaBaseUrl();
  const model = ollamaModels().embedding;
  const res = await fetch(`${base}/v1/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: ["dimension probe"] }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Ollama embeddings ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data?: { embedding?: number[] }[] };
  const dim = json.data?.[0]?.embedding?.length ?? 0;
  if (!dim) throw new Error(`Embedding model ${model} returned no vector`);
  return dim;
}
