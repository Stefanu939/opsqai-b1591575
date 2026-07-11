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
} from "./registry";
