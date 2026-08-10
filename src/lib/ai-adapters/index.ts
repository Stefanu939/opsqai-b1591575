export type {
  AIChatRole,
  AIModelRole,
  AIProviderAdapter,
  ResolvedTTS,
  ResolvedEmbeddings,
} from "./types";
export {
  getActiveAdapter,
  getAdapter,
  listAdapters,
  registerAdapter,
  DEFAULT_ADAPTER_ID,
  SELFHOST_DEFAULT_ADAPTER_ID,
  defaultAdapterId,
} from "./registry";
export { ollamaAdapter, probeOllama, probeEmbeddingDimension, ollamaBaseUrl, ollamaModels } from "./ollama";
export type { OllamaProbeResult, OllamaProbeStep } from "./ollama";
export {
  OLLAMA_DEFAULT_BASE_URL,
  OLLAMA_DEFAULT_MODELS,
  OLLAMA_EXPECTED_EMBEDDING_DIM,
} from "./ollama-models";
