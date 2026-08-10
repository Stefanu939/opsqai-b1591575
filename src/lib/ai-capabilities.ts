// Central AI capability registry (Global Self-Hosted AI Contract).
//
// Modules NEVER assume a capability exists and NEVER branch on provider
// identity. They ask the central provider layer what the active engine can
// do (`aiCapabilities()` in `ai-provider.server.ts`) and degrade gracefully
// when something is unsupported. There is no cloud fallback: a Self-Hosted
// deployment that cannot do X reports X as unsupported.
//
// This module is intentionally dependency-free so both server code and the
// admin UI can import the types.

export type AICapabilityName =
  | "chat"
  | "fastChat"
  | "embeddings"
  | "structuredOutput"
  | "jsonOutput"
  | "streaming"
  | "toolCalling"
  | "vision"
  | "audioInput"
  | "textToSpeech";

export type AICapabilities = Record<AICapabilityName, boolean>;

export const AI_CAPABILITY_NAMES: readonly AICapabilityName[] = [
  "chat",
  "fastChat",
  "embeddings",
  "structuredOutput",
  "jsonOutput",
  "streaming",
  "toolCalling",
  "vision",
  "audioInput",
  "textToSpeech",
];

export const NO_CAPABILITIES: AICapabilities = {
  chat: false,
  fastChat: false,
  embeddings: false,
  structuredOutput: false,
  jsonOutput: false,
  streaming: false,
  toolCalling: false,
  vision: false,
  audioInput: false,
  textToSpeech: false,
};

export function capabilities(overrides: Partial<AICapabilities>): AICapabilities {
  return { ...NO_CAPABILITIES, ...overrides };
}

/** Human-readable labels for admin UI / error messages. */
export const AI_CAPABILITY_LABELS: Record<AICapabilityName, string> = {
  chat: "Chat",
  fastChat: "Fast chat",
  embeddings: "Embeddings",
  structuredOutput: "Structured output",
  jsonOutput: "JSON output",
  streaming: "Streaming",
  toolCalling: "Tool calling",
  vision: "Vision (image input)",
  audioInput: "Audio input",
  textToSpeech: "Text to speech",
};

/**
 * Thrown when a module asks for an AI capability the active engine does not
 * provide, or when the local engine is unreachable. Callers surface this to
 * the user/admin — they must NEVER retry against a cloud provider.
 */
export class AiCapabilityError extends Error {
  readonly capability: AICapabilityName | null;
  readonly providerId: string;
  readonly code: "unsupported" | "unavailable";

  constructor(args: {
    capability: AICapabilityName | null;
    providerId: string;
    code?: "unsupported" | "unavailable";
    message?: string;
  }) {
    const label = args.capability ? AI_CAPABILITY_LABELS[args.capability] : "AI";
    super(
      args.message ??
        `${label} is not available on the active AI engine (${args.providerId}). ` +
          `No cloud fallback is used — configure the local engine to enable it.`,
    );
    this.name = "AiCapabilityError";
    this.capability = args.capability;
    this.providerId = args.providerId;
    this.code = args.code ?? "unsupported";
  }
}
