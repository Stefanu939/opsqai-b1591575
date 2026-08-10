import { describe, it, expect } from "vitest";
import {
  classifyChatError,
  chatErrorMessage,
  isChatStalled,
  CHAT_STALL_TIMEOUT_MS,
} from "@/lib/chat-reliability";

describe("isChatStalled", () => {
  it("is false while tokens keep arriving", () => {
    expect(isChatStalled(1_000, 1_000 + CHAT_STALL_TIMEOUT_MS - 1)).toBe(false);
  });
  it("is true once the timeout elapses", () => {
    expect(isChatStalled(1_000, 1_000 + CHAT_STALL_TIMEOUT_MS)).toBe(true);
  });
});

describe("classifyChatError", () => {
  it("detects a dead local engine", () => {
    expect(classifyChatError("fetch failed: connect ECONNREFUSED 127.0.0.1:11434")).toBe(
      "unavailable",
    );
    expect(classifyChatError('Capability "chat" is not supported')).toBe("unavailable");
  });
  it("detects auth and timeout failures", () => {
    expect(classifyChatError("401 Unauthorized")).toBe("unauthorized");
    expect(classifyChatError("request timed out")).toBe("timeout");
  });
  it("falls back to unknown", () => {
    expect(classifyChatError(undefined)).toBe("unknown");
  });
});

describe("chatErrorMessage", () => {
  it("always returns actionable copy", () => {
    for (const kind of ["unavailable", "unauthorized", "timeout", "network", "unknown"] as const) {
      expect(chatErrorMessage(kind).length).toBeGreaterThan(10);
    }
  });
});
