import { describe, expect, it } from "vitest";
import {
  academyLanguageQualityIssue,
  academyTrueFalseOptions,
  localizedAcademyQuizFallback,
} from "@/lib/academy-language";
import { checkAcademyGrounding, unsupportedNumbers } from "@/lib/academy-grounding";

describe("Academy language quality", () => {
  it("flags Romanian text written without diacritics", () => {
    const text =
      "Procedura aprobata trebuie respectata de fiecare data cand pregatesti marfa pentru livrare, iar sofer trebuie sa verifice documentele inainte de plecare din depozit.";
    expect(academyLanguageQualityIssue(text, "ro")).toBe("diacritics");
  });

  it("accepts correct Romanian", () => {
    const text =
      "Procedura aprobată trebuie respectată de fiecare dată când pregătești marfa pentru livrare, iar șoferul trebuie să verifice documentele înainte de plecare din depozit.";
    expect(academyLanguageQualityIssue(text, "ro")).toBeNull();
  });

  it("flags an answer written in another language", () => {
    const text =
      "The approved procedure must be followed every time and the driver must check the documents before leaving the warehouse with the goods.";
    expect(academyLanguageQualityIssue(text, "ro")).toBe("language");
  });

  it("flags Cyrillic leakage as a script problem", () => {
    expect(
      academyLanguageQualityIssue(
        "Procedura aprobată trebuie respectată. Какие роли участвуют в процессе доставки товара?",
        "ro",
      ),
    ).toBe("script");
  });
});

describe("Academy quiz format", () => {
  it("returns only true/false questions in the fallback", () => {
    const questions = localizedAcademyQuizFallback("ro", "Operațiuni în depozit");
    expect(questions.every((q) => q.type === "true_false")).toBe(true);
    expect(questions.every((q) => q.options?.length === 2)).toBe(true);
    expect(questions.map((q) => q.correct_answer)).toEqual(["Adevărat", "Fals"]);
  });

  it("exposes localized true/false labels", () => {
    expect(academyTrueFalseOptions("ro")).toEqual(["Adevărat", "Fals"]);
    expect(academyTrueFalseOptions("de")).toEqual(["Richtig", "Falsch"]);
  });
});

describe("Academy grounding", () => {
  const lesson =
    "SECTION 3 — EXPLANATION:\nȘoferul verifică documentele CMR înainte de plecare. Marfa se sigilează după încărcare.";

  it("accepts a statement restated from the lesson", () => {
    expect(
      checkAcademyGrounding("Șoferul verifică documentele CMR înainte de plecare.", lesson, {
        checkTerms: true,
      }).grounded,
    ).toBe(true);
  });

  it("rejects an invented number", () => {
    expect(unsupportedNumbers("Verificarea durează 15 minute.", lesson)).toEqual(["15"]);
    expect(checkAcademyGrounding("Verificarea durează 15 minute.", lesson).grounded).toBe(false);
  });

  it("rejects invented specialised terms", () => {
    const verdict = checkAcademyGrounding(
      "Coordonatorul de rampă completează formularul de tahograf și raportul de temperatură.",
      lesson,
      { checkTerms: true },
    );
    expect(verdict.grounded).toBe(false);
  });
});
