import { describe, expect, it } from "vitest";
// @ts-expect-error — plain .mjs build script, no type declarations.
import { scanSources, isAllowed } from "../verify-ai-boundary.mjs";

type Violation = { file: string; rule: string };

const scan = (files: [string, string][]) => scanSources(files) as Violation[];

describe("verify-ai-boundary", () => {
  it("flags a feature module reading the cloud AI credential", () => {
    const v = scan([
      ["src/lib/reports.functions.ts", "const key = process.env.LOVABLE_API_KEY;"],
    ]);
    expect(v.map((x) => x.rule)).toContain("lovable-api-key");
  });

  it("flags a route constructing its own gateway provider", () => {
    const v = scan([
      [
        "src/routes/api/new-module.ts",
        'import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";',
      ],
    ]);
    expect(v.length).toBeGreaterThan(0);
  });

  it("flags a direct provider client in a feature module", () => {
    const v = scan([
      ["src/lib/audit.functions.ts", 'import { createOpenAICompatible } from "@ai-sdk/openai-compatible";'],
    ]);
    expect(v.map((x) => x.rule)).toContain("provider-client");
  });

  it("flags a direct external AI endpoint", () => {
    const v = scan([
      ["src/routes/api/speak.ts", 'await fetch("https://api.openai.com/v1/audio/speech");'],
    ]);
    expect(v.map((x) => x.rule)).toContain("external-ai-host");
  });

  it("flags hard-coded model ids in feature modules", () => {
    const v = scan([
      ["src/lib/kb.functions.ts", 'const model = "google/gemini-3-flash-preview";'],
      ["src/lib/sop.functions.ts", 'const local = "qwen2.5:7b";'],
    ]);
    expect(v.filter((x) => x.rule === "hardcoded-model")).toHaveLength(2);
  });

  it("accepts feature code that uses the central provider", () => {
    const v = scan([
      [
        "src/lib/kb.functions.ts",
        'import { generateAiText } from "@/lib/ai-provider.server";\nconst t = await generateAiText({ role: "chat", prompt });',
      ],
    ]);
    expect(v).toHaveLength(0);
  });

  it("allows the provider/adaptor layer itself", () => {
    expect(isAllowed("src/lib/ai-adapters/lovable.ts")).toBe(true);
    expect(isAllowed("src/lib/ai-provider.server.ts")).toBe(true);
    expect(isAllowed("src/lib/reports.functions.ts")).toBe(false);
    expect(isAllowed("src/routes/api/anything.ts")).toBe(false);
  });

  it("ignores comments and documentation lines", () => {
    const v = scan([
      ["src/lib/kb.functions.ts", "// never read LOVABLE_API_KEY here — use the central provider"],
    ]);
    expect(v).toHaveLength(0);
  });
});
