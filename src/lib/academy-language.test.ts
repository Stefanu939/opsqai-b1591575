import { describe, expect, it } from "vitest";
import {
  hasWrongAcademyScript,
  localizedAcademyQuizFallback,
  normalizeAcademyLanguage,
} from "./academy-language";

describe("Academy language contract", () => {
  it("normalizes locale variants to supported language codes", () => {
    expect(normalizeAcademyLanguage("ro-RO")).toBe("ro");
    expect(normalizeAcademyLanguage("RO_ro")).toBe("ro");
    expect(normalizeAcademyLanguage("unknown")).toBe("en");
  });

  it("rejects Cyrillic leakage from Romanian content", () => {
    expect(hasWrongAcademyScript("Care este rolul liderului de echipă?", "ro")).toBe(false);
    expect(hasWrongAcademyScript("Какие роли sunt menționate?", "ro")).toBe(true);
  });

  it("builds a fully localized Romanian fallback quiz", () => {
    const questions = localizedAcademyQuizFallback("ro", "Operațiuni în depozit");
    expect(questions[0].question).toContain("Care este scopul operațional");
    expect(questions[1].options).toEqual(["Adevărat", "Fals"]);
    expect(hasWrongAcademyScript(JSON.stringify(questions), "ro")).toBe(false);
  });
});