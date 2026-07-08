// Additive provider abstraction for OPSQAI Self-Hosted deployments.
// OPSQAI Cloud continues to use ai-gateway.server.ts / embeddings.server.ts unchanged.
// This module is not imported by any existing call site — it exists for future
// self-hosted work where AI_PROVIDER selects Lovable / Azure OpenAI / a generic
// OpenAI-compatible endpoint.

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAzure } from "@ai-sdk/azure";
import type { LanguageModel } from "ai";

// Logical roles used throughout the app — callers never reference a
// provider-specific model ID directly, only these roles.
// TTS is intentionally NOT part of AIModelRole for `resolveChatModel`:
// TTS uses /v1/audio/speech, not a chat LanguageModel. Use `resolveTTS()`.
export type AIChatRole = "chat" | "chat-fast";
export type AIModelRole = AIChatRole | "tts" | "embedding";

type ProviderKind = "lovable" | "azure-openai" | "openai-compatible";

interface ResolvedModelMap {
  chat: string;
  "chat-fast": string;
  tts: string;
  embedding: string;
}

// Per-provider mapping from logical role -> actual model/deployment ID.
// Lovable values match what OPSQAI Cloud already uses today.
const MODEL_MAPS: Record<ProviderKind, ResolvedModelMap> = {
  lovable: {
    chat: "google/gemini-3-flash-preview",
    "chat-fast": "google/gemini-2.5-flash",
    tts: "openai/gpt-4o-mini-tts",
    embedding: "openai/text-embedding-3-small",
  },
  // Azure deployment names are whatever the customer named them when they
  // created the deployment in their Azure OpenAI resource. These env vars
  // let each self-hosted customer map their own deployment names.
  "azure-openai": {
    chat: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? "gpt-4o",
    "chat-fast": process.env.AZURE_OPENAI_CHAT_FAST_DEPLOYMENT ?? "gpt-4o-mini",
    tts: process.env.AZURE_OPENAI_TTS_DEPLOYMENT ?? "tts",
    embedding: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? "text-embedding-3-small",
  },
  "openai-compatible": {
    chat: process.env.GENERIC_AI_CHAT_MODEL ?? "gpt-4o",
    "chat-fast": process.env.GENERIC_AI_CHAT_FAST_MODEL ?? "gpt-4o-mini",
    tts: process.env.GENERIC_AI_TTS_MODEL ?? "tts-1",
    embedding: process.env.GENERIC_AI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  },
};

// Embedding vector dimensions. Must match the pgvector column across all
// providers. Override via EMBEDDING_DIMENSIONS if a customer picks a model
// with a different native size (e.g. text-embedding-3-large = 3072).
const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);

function getProviderKind(): ProviderKind {
  const raw = (process.env.AI_PROVIDER ?? "lovable").toLowerCase();
  if (raw === "azure" || raw === "azure-openai") return "azure-openai";
  if (raw === "openai-compatible" || raw === "generic") return "openai-compatible";
  return "lovable";
}

/**
 * Returns a chat-capable LanguageModel for the given logical role.
 * OPSQAI Cloud: AI_PROVIDER unset -> Lovable Gateway (unchanged behaviour).
 * OPSQAI Self-Hosted: AI_PROVIDER=azure -> customer's own Azure OpenAI resource.
 */
export function resolveChatModel(role: AIChatRole): LanguageModel {
  const kind = getProviderKind();
  const modelId = MODEL_MAPS[kind][role];

  if (kind === "lovable") {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: {
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });
    return gateway(modelId);
  }

  if (kind === "azure-openai") {
    const resourceName = process.env.AZURE_OPENAI_RESOURCE_NAME;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    if (!resourceName || !apiKey) {
      throw new Error("AZURE_OPENAI_RESOURCE_NAME / AZURE_OPENAI_API_KEY missing");
    }
    const azure = createAzure({
      resourceName,
      apiKey,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
    });
    return azure(modelId);
  }

  const baseURL = process.env.GENERIC_AI_BASE_URL;
  const apiKey = process.env.GENERIC_AI_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error("GENERIC_AI_BASE_URL / GENERIC_AI_API_KEY missing");
  }
  const generic = createOpenAICompatible({ name: "generic", baseURL, apiKey });
  return generic(modelId);
}

/**
 * Resolved TTS endpoint descriptor. Callers POST to `url` with the OpenAI
 * `/v1/audio/speech` request shape ({ model?, input, voice, response_format, ... })
 * and receive raw audio bytes (or SSE frames). `model` is already the
 * provider-specific deployment/model id — callers should include it in the
 * body except on Azure, where the deployment is encoded in the URL path.
 */
export interface ResolvedTTS {
  url: string;
  headers: Record<string, string>;
  model: string;
  /** True when the model id must NOT be sent in the request body (Azure). */
  modelInPath: boolean;
}

export function resolveTTS(): ResolvedTTS {
  const kind = getProviderKind();
  const modelId = MODEL_MAPS[kind].tts;

  if (kind === "lovable") {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    return {
      url: "https://ai.gateway.lovable.dev/v1/audio/speech",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      model: modelId,
      modelInPath: false,
    };
  }

  if (kind === "azure-openai") {
    const resourceName = process.env.AZURE_OPENAI_RESOURCE_NAME;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";
    if (!resourceName || !apiKey) {
      throw new Error("AZURE_OPENAI_RESOURCE_NAME / AZURE_OPENAI_API_KEY missing");
    }
    return {
      url: `https://${resourceName}.openai.azure.com/openai/deployments/${modelId}/audio/speech?api-version=${apiVersion}`,
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      model: modelId,
      modelInPath: true,
    };
  }

  const baseURL = process.env.GENERIC_AI_BASE_URL;
  const apiKey = process.env.GENERIC_AI_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error("GENERIC_AI_BASE_URL / GENERIC_AI_API_KEY missing");
  }
  return {
    url: `${baseURL.replace(/\/$/, "")}/audio/speech`,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    model: modelId,
    modelInPath: false,
  };
}

/**
 * Returns embedding vectors for the given texts, using whichever provider
 * is configured. Vector length is EMBEDDING_DIMENSIONS (default 1536) and
 * must match the pgvector column — override the env var if the customer
 * picks a model with a different native size.
 */
export async function resolveEmbeddings(texts: string[]): Promise<number[][]> {
  const kind = getProviderKind();
  const modelId = MODEL_MAPS[kind].embedding;

  let url: string;
  let headers: Record<string, string>;

  if (kind === "lovable") {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    url = "https://ai.gateway.lovable.dev/v1/embeddings";
    headers = {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    };
  } else if (kind === "azure-openai") {
    const resourceName = process.env.AZURE_OPENAI_RESOURCE_NAME;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";
    if (!resourceName || !apiKey) {
      throw new Error("AZURE_OPENAI_RESOURCE_NAME / AZURE_OPENAI_API_KEY missing");
    }
    url = `https://${resourceName}.openai.azure.com/openai/deployments/${modelId}/embeddings?api-version=${apiVersion}`;
    headers = { "Content-Type": "application/json", "api-key": apiKey };
  } else {
    const baseURL = process.env.GENERIC_AI_BASE_URL;
    const apiKey = process.env.GENERIC_AI_API_KEY;
    if (!baseURL || !apiKey) {
      throw new Error("GENERIC_AI_BASE_URL / GENERIC_AI_API_KEY missing");
    }
    url = `${baseURL.replace(/\/$/, "")}/embeddings`;
    headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  }

  const body =
    kind === "azure-openai"
      ? { input: texts }
      : { model: modelId, input: texts, dimensions: EMBEDDING_DIMENSIONS };

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embeddings ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function resolveEmbedOne(text: string): Promise<number[]> {
  const [v] = await resolveEmbeddings([text]);
  return v;
}
