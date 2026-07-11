// AI Provider Adapter contract (Phase 2).
//
// An adapter is a self-contained module that knows how to talk to ONE AI
// provider (Lovable Gateway, Azure OpenAI, a generic OpenAI-compatible
// endpoint, …). All three call-site helpers in `ai-provider.server.ts`
// (`resolveChatModel`, `resolveTTS`, `resolveEmbeddings`) delegate to the
// active adapter — they never branch on provider identity themselves.
//
// To add a new provider (see Engineering Handbook §"Adding an AI provider
// adapter"): implement this interface in `src/lib/ai-adapters/<slug>.ts`
// and register it in `registry.ts`. Nothing else in the app changes.

import type { LanguageModel } from "ai";

export type AIChatRole = "chat" | "chat-fast";
export type AIModelRole = AIChatRole | "tts" | "embedding";

/** Resolved TTS endpoint descriptor. `/v1/audio/speech`-shaped body. */
export interface ResolvedTTS {
  url: string;
  headers: Record<string, string>;
  model: string;
  /** True when the model id must NOT be sent in the request body (Azure). */
  modelInPath: boolean;
}

/** Resolved embeddings endpoint descriptor (adapter builds the request). */
export interface ResolvedEmbeddings {
  url: string;
  headers: Record<string, string>;
  /** Body serializer — Azure omits `model`; others include it + `dimensions`. */
  buildBody: (texts: string[], dimensions: number) => unknown;
}

/**
 * Provider-agnostic adapter. Each adapter is responsible for:
 *   1. reading its own env vars,
 *   2. mapping the logical role to a provider-specific model/deployment id,
 *   3. constructing the transport (LanguageModel for chat, URL+headers
 *      for TTS/embeddings).
 *
 * Adapters MUST NOT log or return env-var values. Missing config should
 * throw a clear `Error` with the missing var names.
 */
export interface AIProviderAdapter {
  /** Stable slug used by AI_PROVIDER env var and audit logs. */
  readonly id: string;
  /** Additional slugs that resolve to this adapter (e.g. `"azure"`). */
  readonly aliases?: readonly string[];
  /** Human-readable label for admin UI + docs. */
  readonly label: string;

  /** Return a chat-capable LanguageModel for the given role. */
  resolveChat(role: AIChatRole): LanguageModel;
  /** Return a TTS endpoint descriptor. */
  resolveTTS(): ResolvedTTS;
  /** Return an embeddings endpoint descriptor. */
  resolveEmbeddings(): ResolvedEmbeddings;
}
