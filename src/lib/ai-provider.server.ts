// Central AI provider — the ONLY boundary between OPSQAI feature code and
// AI inference (Global Self-Hosted AI Contract).
//
// Every module, route, server function, repository, worker and scheduled job
// resolves AI through this file. Modules never instantiate a provider, never
// name a model, and never know whether inference happens locally (Ollama on
// Self-Hosted) or through the Cloud gateway. Adding a provider means adding
// an adapter in `src/lib/ai-adapters/` — no feature code changes.
//
// Enforced at build time by `opsqai-windows/build/verify-ai-boundary.mjs`.

import {
  generateText as sdkGenerateText,
  streamText as sdkStreamText,
  Output,
  NoObjectGeneratedError,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import type { z } from "zod";
import { getActiveAdapter } from "./ai-adapters/registry";
import type { AIChatRole, ResolvedTTS } from "./ai-adapters/types";
import {
  AiCapabilityError,
  NO_CAPABILITIES,
  type AICapabilities,
  type AICapabilityName,
} from "./ai-capabilities";

export type { AIChatRole, AIModelRole, ResolvedTTS, ResolvedSTT } from "./ai-adapters/types";
export {
  AiCapabilityError,
  AI_CAPABILITY_LABELS,
  AI_CAPABILITY_NAMES,
} from "./ai-capabilities";
export type { AICapabilities, AICapabilityName } from "./ai-capabilities";

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

// ---------------------------------------------------------------------------
// Capability registry
// ---------------------------------------------------------------------------

/** Stable id of the active engine (for audit logs and admin UI). */
export function activeAiProviderId(): string {
  try {
    return getActiveAdapter().id;
  } catch {
    return "unconfigured";
  }
}

/** Human label of the active engine. */
export function activeAiProviderLabel(): string {
  try {
    return getActiveAdapter().label;
  } catch {
    return "Not configured";
  }
}

/**
 * What the active engine can do. Declared by the adapter; modules must query
 * this instead of assuming a capability exists.
 */
export function aiCapabilities(): AICapabilities {
  try {
    return getActiveAdapter().capabilities;
  } catch {
    return NO_CAPABILITIES;
  }
}

/** Live verification against the running engine (health probe). */
export async function probeAiCapabilities(): Promise<AICapabilities> {
  let adapter;
  try {
    adapter = getActiveAdapter();
  } catch {
    return NO_CAPABILITIES;
  }
  if (!adapter.probeCapabilities) return adapter.capabilities;
  try {
    return await adapter.probeCapabilities();
  } catch {
    return NO_CAPABILITIES;
  }
}

export function hasAiCapability(name: AICapabilityName): boolean {
  return aiCapabilities()[name] === true;
}

/** Throws an `AiCapabilityError` when the capability is unsupported locally. */
export function assertAiCapability(name: AICapabilityName): void {
  if (!hasAiCapability(name)) {
    throw new AiCapabilityError({ capability: name, providerId: activeAiProviderId() });
  }
}

// ---------------------------------------------------------------------------
// Model / endpoint resolution
// ---------------------------------------------------------------------------

/**
 * Returns a chat-capable LanguageModel for the given logical role. The model
 * id lives in the adapter — never in feature code.
 */
export function resolveChatModel(role: AIChatRole): LanguageModel {
  assertAiCapability(role === "chat-fast" ? "fastChat" : "chat");
  return getActiveAdapter().resolveChat(role);
}

/** Resolved TTS endpoint descriptor. Throws `AiCapabilityError` when unsupported. */
export function resolveTTS(): ResolvedTTS {
  assertAiCapability("textToSpeech");
  return getActiveAdapter().resolveTTS();
}

/** Non-throwing variant for routes that must answer with a clean 501. */
export function resolveTTSOrNull(): ResolvedTTS | null {
  try {
    return resolveTTS();
  } catch {
    return null;
  }
}

/** Resolved speech-to-text endpoint descriptor. Throws `AiCapabilityError` when unsupported. */
export function resolveSTT() {
  assertAiCapability("audioInput");
  const adapter = getActiveAdapter();
  if (!adapter.resolveSTT) {
    throw new AiCapabilityError({ capability: "audioInput", providerId: adapter.id });
  }
  return adapter.resolveSTT();
}

/** Non-throwing variant so voice UI can degrade with a clear message instead of a crash. */
export function resolveSTTOrNull() {
  try {
    return resolveSTT();
  } catch {
    return null;
  }
}

/**
 * Transcribe an audio clip through the active engine's speech-to-text
 * endpoint (multipart `/audio/transcriptions`). Throws `AiCapabilityError`
 * when the deployment has no STT engine configured — callers surface that
 * as a clear, non-crashing message instead of silently failing.
 */
export async function transcribeAudio(
  bytes: Uint8Array,
  mimeType: string,
  filename = "voice-note.webm",
): Promise<string> {
  const { url, headers, model } = resolveSTT();
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mimeType }), filename);
  form.append("model", model);
  const res = await fetch(url, { method: "POST", headers, body: form });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Transcription ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}

/**
 * Synthesize a spoken reply through the active engine's TTS endpoint.
 * Throws `AiCapabilityError` when text-to-speech is unsupported.
 */
export async function synthesizeSpeech(
  text: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const { url, headers, model, modelInPath } = resolveTTS();
  const res = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(
      modelInPath ? { input: text, voice: "alloy" } : { model, input: text, voice: "alloy" },
    ),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Speech synthesis ${res.status}: ${t.slice(0, 300)}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, contentType: res.headers.get("content-type") ?? "audio/mpeg" };
}

/**
 * Returns embedding vectors for the given texts, using whichever provider
 * is configured. Vector length must match the pgvector column.
 */
export async function resolveEmbeddings(texts: string[]): Promise<number[][]> {
  assertAiCapability("embeddings");
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

// ---------------------------------------------------------------------------
// Capability-checked generation helpers
//
// Summarization, classification, extraction, rewriting, SOP generation and
// validation, Academy content and assessments, AI Audit, recommendations,
// reports, KB/FAQ generation, document analysis, RAG and future agents all
// call these. None of them names a model or a provider.
// ---------------------------------------------------------------------------

type ChatRoleArg = AIChatRole;

export interface AiTextRequest {
  role?: ChatRoleArg;
  system?: string;
  prompt?: string;
  messages?: ModelMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  abortSignal?: AbortSignal;
}

type StreamArgs = Parameters<typeof sdkStreamText>[0];
type GenerateArgs = Parameters<typeof sdkGenerateText>[0];

function callArgs(req: AiTextRequest): Record<string, unknown> {
  const { role: _role, ...rest } = req;
  return rest as Record<string, unknown>;
}

/**
 * One-shot text generation. Streams on the wire and resolves the final text,
 * so long local generations are not cut off by request timeouts.
 */
export async function generateAiText(req: AiTextRequest): Promise<string> {
  const role = req.role ?? "chat";
  const model = resolveChatModel(role);
  if (hasAiCapability("streaming")) {
    const result = sdkStreamText({ model, ...callArgs(req) } as StreamArgs);
    return await result.text;
  }
  const { text } = await sdkGenerateText({ model, ...callArgs(req) } as GenerateArgs);
  return text;
}

/** Streaming text generation for chat UIs. Returns the AI SDK stream result. */
export function streamAiText(req: AiTextRequest & Record<string, unknown>) {
  const role = (req.role as ChatRoleArg | undefined) ?? "chat";
  assertAiCapability("streaming");
  const { role: _role, ...rest } = req;
  return sdkStreamText({ model: resolveChatModel(role), ...rest } as StreamArgs);
}

/**
 * Structured generation. Schemas stay constraint-free (state limits in the
 * prompt); malformed local output degrades through `fallback` instead of
 * crashing the caller.
 */
export async function generateAiObject<T>(
  req: AiTextRequest & {
    schema: z.ZodType<T>;
    fallback?: (rawText: string) => T | null;
  },
): Promise<T> {
  assertAiCapability("structuredOutput");
  const { schema, fallback, role, ...rest } = req;
  const model = resolveChatModel(role ?? "chat");
  try {
    const result = sdkStreamText({
      model,
      ...rest,
      output: Output.object({ schema }),
    } as StreamArgs);
    return (await (result as unknown as { output: Promise<T> }).output) as T;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      const recovered = fallback?.(error.text ?? "");
      if (recovered != null) return recovered;
    }
    throw error;
  }
}

/**
 * Free-form JSON generation for callers that parse the payload themselves
 * (the pattern used by the Academy / Audit generators).
 */
export async function generateAiJson(req: AiTextRequest): Promise<string> {
  assertAiCapability("jsonOutput");
  return generateAiText(req);
}
