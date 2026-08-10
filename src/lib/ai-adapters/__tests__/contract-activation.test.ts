import { describe, it, expect, afterEach } from "vitest";
import { getActiveAdapter, defaultAdapterId } from "@/lib/ai-adapters/registry";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("AI contract — adapter activation", () => {
  it("defaults Cloud to the gateway", () => {
    delete process.env.OPSQAI_PLATFORM_MODE;
    delete process.env.OPSQAI_DEPLOYMENT_TYPE;
    expect(defaultAdapterId()).toBe("lovable");
  });

  it("defaults Self-Hosted to the local engine", () => {
    process.env.OPSQAI_PLATFORM_MODE = "selfhost";
    expect(defaultAdapterId()).toBe("ollama");
    delete process.env.AI_PROVIDER;
    expect(getActiveAdapter().id).toBe("ollama");
  });

  it("refuses a cloud engine on Self-Hosted instead of silently falling back", () => {
    process.env.OPSQAI_PLATFORM_MODE = "selfhost";
    process.env.AI_PROVIDER = "lovable";
    expect(() => getActiveAdapter()).toThrow(/Self-Hosted/i);
  });

  it("throws on an unknown provider id", () => {
    process.env.AI_PROVIDER = "definitely-not-a-provider";
    expect(() => getActiveAdapter()).toThrow(/Unknown AI_PROVIDER/);
  });
});
