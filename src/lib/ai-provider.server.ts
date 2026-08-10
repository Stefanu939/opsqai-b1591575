// AI provider facade for OPSQAI.
//
// Phase 2: this module is now a thin facade over the adapter registry in
// `src/lib/ai-adapters/`. Adding a new provider does NOT require editing
// this file — register the adapter and it becomes selectable via the
// `AI_PROVIDER` env var. See `docs/engineering/adding-an-ai-provider.md`
// (Engineering Handbook, ships in Phase 7).
//
// The public surface (`resolveChatModel`, `resolveTTS`, `resolveEmbeddings`,
// `resolveEmbedOne`) is preserved so existing call sites (chat routes,
// embeddings pipeline, TTS route) continue to work unchanged.

import type { LanguageModel } from "ai";
import { getActiveAdapter } from "./ai-adapters/registry";
import type { AIChatRole, ResolvedTTS } from "./ai-adapters/types";

export type { AIChatRole, AIModelRole, ResolvedTTS } from "./ai-adapters/types";

// Embedding vector dimensions.
//
// This is NOT a hard-coded constant for the database layer: on Self-Hosted
// the value is probed from the local embedding model at install time and
// pinned per install (config.json `ai.embeddingDim` -> OPSQAI_EMBEDDING_DIM).
// Cloud keeps the Gateway model's 1536. Providers that cannot truncate
// (Ollama) ignore the hint and return their native length.
export function embeddingDimensions(): number {
  const raw = process.env.OPSQAI_EMBEDDING_DIM ?? process.env.EMBEDDING_DIMENSIONS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1536;
}


/**
 * Returns a chat-capable LanguageModel for the given logical role.
 * OPSQAI Cloud: AI_PROVIDER unset -> Lovable Gateway.
 * OPSQAI Self-Hosted: AI_PROVIDER=azure|openai-compatible -> customer's provider.
 */
export function resolveChatModel(role: AIChatRole): LanguageModel {
  return getActiveAdapter().resolveChat(role);
}

/** Resolved TTS endpoint descriptor. */
export function resolveTTS(): ResolvedTTS {
  return getActiveAdapter().resolveTTS();
}

/**
 * Returns embedding vectors for the given texts, using whichever provider
 * is configured. Vector length is EMBEDDING_DIMENSIONS (default 1536) and
 * must match the pgvector column.
 */
export async function resolveEmbeddings(texts: string[]): Promise<number[][]> {
  const { url, headers, buildBody } = getActiveAdapter().resolveEmbeddings();
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(buildBody(texts, embeddingDimensions())),
  });
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
