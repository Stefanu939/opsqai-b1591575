// Pure helpers for chat reliability (stall detection + error copy).
// Kept free of React so they can be unit-tested directly.

/** No streamed token for this long ⇒ treat the request as stalled. */
export const CHAT_STALL_TIMEOUT_MS = 90_000;

export function isChatStalled(
  lastActivityAt: number,
  now: number,
  timeoutMs: number = CHAT_STALL_TIMEOUT_MS,
): boolean {
  return now - lastActivityAt >= timeoutMs;
}

export type ChatFailureKind = "unavailable" | "unauthorized" | "timeout" | "network" | "unknown";

/**
 * Classifies a chat failure so the UI can show an actionable message instead
 * of an endless "thinking" state.
 */
export function classifyChatError(message: string | undefined | null): ChatFailureKind {
  const m = (message ?? "").toLowerCase();
  if (!m) return "unknown";
  if (m.includes("timed out") || m.includes("timeout") || m.includes("stalled")) return "timeout";
  if (m.includes("401") || m.includes("unauthorized")) return "unauthorized";
  if (
    m.includes("ollama") ||
    m.includes("econnrefused") ||
    m.includes("not configured") ||
    m.includes("unavailable") ||
    m.includes("503") ||
    m.includes("capability")
  ) {
    return "unavailable";
  }
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("aborted")) {
    return "network";
  }
  return "unknown";
}

export function chatErrorMessage(kind: ChatFailureKind): string {
  switch (kind) {
    case "unavailable":
      return "The local AI engine is not responding. Check Engine Health in Organization settings, then retry.";
    case "unauthorized":
      return "Your session expired. Sign in again to continue this conversation.";
    case "timeout":
      return "The answer took too long and was stopped. Retry, or try a shorter question.";
    case "network":
      return "Connection lost while answering. Check your network and retry.";
    default:
      return "Something went wrong while answering. Please retry.";
  }
}
