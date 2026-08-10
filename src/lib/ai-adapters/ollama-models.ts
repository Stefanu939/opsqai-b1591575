// Central model defaults for the local Ollama engine.
//
// This is the ONE place to change the recommended local models for a
// release. The installer, the platform service and the adapter all read
// from here so a fresh install and the running app agree.
//
// Chat: qwen2.5:7b  — strong multilingual instruction following (DE/RO/EN)
// Fast: qwen2.5:3b  — cheap/quick role for classification + short tasks
// Embed: bge-m3     — multilingual retrieval, native 1024 dims
//
// The embedding dimension is NEVER assumed from this file: it is probed
// from the running model at install time and pinned per install. The value
// below only documents what to expect.

export const OLLAMA_DEFAULT_BASE_URL = "http://127.0.0.1:11434";

export const OLLAMA_DEFAULT_MODELS = {
  chat: "qwen2.5:7b",
  chatFast: "qwen2.5:3b",
  embedding: "bge-m3",
} as const;

/** Informational only — the real value comes from probing the model. */
export const OLLAMA_EXPECTED_EMBEDDING_DIM = 1024;
