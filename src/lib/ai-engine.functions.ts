// Local AI engine (Ollama) administration for OPSQAI Self-Hosted.
//
// Self-Hosted runs its AI entirely on the customer's machine. These server
// functions expose the engine's live health, the models in use and the pinned
// embedding dimension, and let a platform admin change models without ever
// asking for an API key.
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { PlatformMode, getPlatformMode } from "@/lib/platform";
import { z } from "zod";

const OllamaConfigSchema = z.object({
  base_url: z.string().min(1).max(300),
  chat_model: z.string().min(1).max(200),
  chat_fast_model: z.string().min(1).max(200),
  embedding_model: z.string().min(1).max(200),
});

function selfHostedOnly(): void {
  if (getPlatformMode() !== PlatformMode.SelfHosted) {
    throw new Error(
      "The local AI engine is only available in the Self-Hosted edition.",
    );
  }
}

/** Live status of the local engine: reachability, models, embedding dimension. */
export const getAiEngineStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    selfHostedOnly();

    const { probeOllama, ollamaBaseUrl, ollamaModels } = await import(
      "@/lib/ai-adapters/ollama"
    );
    const probe = await probeOllama(45_000);
    const pinned = Number(process.env.OPSQAI_EMBEDDING_DIM ?? 0);

    return {
      engine: "ollama" as const,
      base_url: ollamaBaseUrl(),
      models: ollamaModels(),
      pinned_embedding_dim: Number.isFinite(pinned) && pinned > 0 ? pinned : null,
      probe,
    };
  });

/** Persist model / URL changes, re-probe the vector length and realign the DB. */
export const saveAiEngineConfig = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => OllamaConfigSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    selfHostedOnly();

    const { readSelfHostConfig, setSelfHostAiConfig } = await import(
      "@/lib/selfhost-config.server"
    );
    const cfg = readSelfHostConfig();
    setSelfHostAiConfig({
      ...cfg.ai,
      provider: "ollama",
      base_url: data.base_url,
      model: data.chat_model,
      chat_model: data.chat_model,
      chat_fast_model: data.chat_fast_model,
      embedding_model: data.embedding_model,
    });

    // The embedding model decides the vector length. Probe the live model and
    // realign pgvector when it differs from the pinned dimension.
    const { probeEmbeddingDimension } = await import("@/lib/ai-adapters/ollama");
    let dim: number | null = null;
    let realigned = false;
    try {
      dim = await probeEmbeddingDimension(60_000);
    } catch {
      return {
        ok: true,
        embedding_dim: null,
        realigned: false,
        warning:
          "Saved, but the embedding model could not be reached. Pull it in Ollama, then save again to pin the vector dimension.",
      };
    }

    const previous = Number(process.env.OPSQAI_EMBEDDING_DIM ?? 0);
    if (dim && dim !== previous) {
      const { applyEmbeddingDimension } = await import(
        "@/lib/ai-engine.server"
      );
      await applyEmbeddingDimension(dim);
      realigned = true;
    }
    setSelfHostAiConfig({ ...readSelfHostConfig().ai, embeddingDim: dim ?? undefined });

    return { ok: true, embedding_dim: dim, realigned, warning: null as string | null };
  });
