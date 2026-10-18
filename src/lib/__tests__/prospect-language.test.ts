import { describe, expect, it } from "vitest";
import { ProspectLanguageSchema, prospectLanguageInstruction, resolvePublicLanguage } from "../prospect-language";

describe("KAI language selection", () => {
  it("uses Romanian on a first public visit", () => {
    expect(resolvePublicLanguage(null, null)).toBe("ro");
    expect(ProspectLanguageSchema.parse(undefined)).toBe("ro");
  });
  it("respects a saved English or German choice on later visits", () => {
    expect(resolvePublicLanguage("en", null)).toBe("en");
    expect(resolvePublicLanguage("de", "ro")).toBe("de");
  });
  it("accepts all three selectable answer languages and rejects others", () => {
    for (const language of ["ro", "en", "de"]) expect(ProspectLanguageSchema.parse(language)).toBe(language);
    expect(ProspectLanguageSchema.safeParse("fr").success).toBe(false);
    expect(prospectLanguageInstruction("de")).toContain("Answer in German (Deutsch)");
    expect(prospectLanguageInstruction("en")).toContain("regardless of the language of the question");
  });
});