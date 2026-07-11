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

// Embedding vector dimensions. Must match the pgvector column across all
// providers. Override via EMBEDDING_DIMENSIONS if a customer picks a model
// with a different native size (e.g. text-embedding-3-large = 3072).
const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);

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
    body: JSON.stringify(buildBody(texts, EMBEDDING_DIMENSIONS)),
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
