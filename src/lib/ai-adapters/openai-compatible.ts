// Generic OpenAI-compatible adapter (self-hosted vLLM, Ollama, LM Studio,
// any provider that speaks the OpenAI HTTP API).
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { AIChatRole, AIProviderAdapter, ResolvedEmbeddings, ResolvedTTS } from "./types";

function models() {
  return {
    chat: process.env.GENERIC_AI_CHAT_MODEL ?? "gpt-4o",
    "chat-fast": process.env.GENERIC_AI_CHAT_FAST_MODEL ?? "gpt-4o-mini",
    tts: process.env.GENERIC_AI_TTS_MODEL ?? "tts-1",
    embedding: process.env.GENERIC_AI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  } as const;
}

function requireConfig() {
  const baseURL = process.env.GENERIC_AI_BASE_URL;
  const apiKey = process.env.GENERIC_AI_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error("GENERIC_AI_BASE_URL / GENERIC_AI_API_KEY missing");
  }
  return { baseURL: baseURL.replace(/\/$/, ""), apiKey };
}

export const openaiCompatibleAdapter: AIProviderAdapter = {
  id: "openai-compatible",
  aliases: ["generic"],
  label: "OpenAI-compatible endpoint",

  resolveChat(role: AIChatRole): LanguageModel {
    const { baseURL, apiKey } = requireConfig();
    const generic = createOpenAICompatible({ name: "generic", baseURL, apiKey });
    return generic(models()[role]);
  },

  resolveTTS(): ResolvedTTS {
    const { baseURL, apiKey } = requireConfig();
    return {
      url: `${baseURL}/audio/speech`,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      model: models().tts,
      modelInPath: false,
    };
  },

  resolveEmbeddings(): ResolvedEmbeddings {
    const { baseURL, apiKey } = requireConfig();
    const modelId = models().embedding;
    return {
      url: `${baseURL}/embeddings`,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      buildBody: (texts, dimensions) => ({ model: modelId, input: texts, dimensions }),
    };
  },
};
