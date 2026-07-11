import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getActiveAdapter,
  getAdapter,
  listAdapters,
  registerAdapter,
  DEFAULT_ADAPTER_ID,
} from "../registry";
import type { AIProviderAdapter } from "../types";

const ENV_KEY = "AI_PROVIDER";
let originalEnv: string | undefined;

beforeEach(() => {
  originalEnv = process.env[ENV_KEY];
  delete process.env[ENV_KEY];
});
afterEach(() => {
  if (originalEnv === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = originalEnv;
});

describe("ai-adapters registry", () => {
  it("registers built-in adapters", () => {
    const ids = listAdapters().map((a) => a.id);
    expect(ids).toContain("lovable");
    expect(ids).toContain("azure-openai");
    expect(ids).toContain("openai-compatible");
  });

  it("resolves adapters by alias", () => {
    expect(getAdapter("azure")?.id).toBe("azure-openai");
    expect(getAdapter("generic")?.id).toBe("openai-compatible");
    expect(getAdapter("AZURE")?.id).toBe("azure-openai");
  });

  it("returns null for unknown adapter id", () => {
    expect(getAdapter("does-not-exist")).toBeNull();
  });

  it("falls back to the default adapter when AI_PROVIDER is unset", () => {
    expect(getActiveAdapter().id).toBe(DEFAULT_ADAPTER_ID);
  });

  it("respects AI_PROVIDER env var", () => {
    process.env[ENV_KEY] = "azure";
    expect(getActiveAdapter().id).toBe("azure-openai");
  });

  it("throws on unknown AI_PROVIDER value (no silent fallback)", () => {
    process.env[ENV_KEY] = "bogus";
    expect(() => getActiveAdapter()).toThrow(/Unknown AI_PROVIDER/);
  });

  it("supports registering a custom adapter", () => {
    const custom: AIProviderAdapter = {
      id: "test-custom",
      label: "Custom Test",
      resolveChat: () => { throw new Error("nope"); },
      resolveTTS: () => { throw new Error("nope"); },
      resolveEmbeddings: () => { throw new Error("nope"); },
    };
    registerAdapter(custom);
    expect(getAdapter("test-custom")?.label).toBe("Custom Test");
  });
});
