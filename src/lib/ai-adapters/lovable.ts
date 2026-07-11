// Lovable AI Gateway adapter (default for OPSQAI Cloud).
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { AIChatRole, AIProviderAdapter, ResolvedEmbeddings, ResolvedTTS } from "./types";

const MODELS = {
  chat: "google/gemini-3-flash-preview",
  "chat-fast": "google/gemini-2.5-flash",
  tts: "openai/gpt-4o-mini-tts",
  embedding: "openai/text-embedding-3-small",
} as const;

const BASE_URL = "https://ai.gateway.lovable.dev/v1";

function requireKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  return key;
}

function gatewayHeaders(key: string): Record<string, string> {
  return {
    "Lovable-API-Key": key,
    "X-Lovable-AIG-SDK": "vercel-ai-sdk",
  };
}

export const lovableAdapter: AIProviderAdapter = {
  id: "lovable",
  label: "Lovable AI Gateway",

  resolveChat(role: AIChatRole): LanguageModel {
    const key = requireKey();
    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: BASE_URL,
      headers: gatewayHeaders(key),
    });
    return gateway(MODELS[role]);
  },

  resolveTTS(): ResolvedTTS {
    const key = requireKey();
    return {
      url: `${BASE_URL}/audio/speech`,
      headers: { "Content-Type": "application/json", ...gatewayHeaders(key) },
      model: MODELS.tts,
      modelInPath: false,
    };
  },

  resolveEmbeddings(): ResolvedEmbeddings {
    const key = requireKey();
    return {
      url: `${BASE_URL}/embeddings`,
      headers: { "Content-Type": "application/json", ...gatewayHeaders(key) },
      buildBody: (texts, dimensions) => ({ model: MODELS.embedding, input: texts, dimensions }),
    };
  },
};
