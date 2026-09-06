import { describe, expect, it } from "vitest";
import {
  answerLanguageMismatch,
  answerSpeculates,
  detectLanguage,
  groundedSystemPrompt,
  passesGrounding,
  refusalText,
} from "@/lib/chat-grounding";

describe("chat grounding gate", () => {
  it("blocks answers with no sources", () => {
    expect(passesGrounding([], 0)).toBe(false);
  });

  it("blocks weak document-only evidence", () => {
    expect(passesGrounding([{ type: "document", similarity: 0.31 }], 0.31)).toBe(false);
  });

  it("allows document evidence above the similarity threshold", () => {
    expect(passesGrounding([{ type: "document", similarity: 0.55 }], 0.55)).toBe(true);
  });

  it("allows a confident FAQ match even with weak vectors", () => {
    expect(passesGrounding([{ type: "faq", confidence: "high" }], 0.05)).toBe(true);
    expect(passesGrounding([{ type: "faq", confidence: "low" }], 0.05)).toBe(false);
  });
});

describe("answer language", () => {
  it("follows the query language, not the interface hint", () => {
    expect(detectLanguage("Care este procedura de returnare?", "en")).toBe("ro");
    expect(detectLanguage("Wie muss ich das Formular ausfüllen?", "en")).toBe("de");
    expect(detectLanguage("How should I escalate this?", "de")).toBe("en");
  });

  it("returns a localized refusal", () => {
    expect(refusalText("Care este procedura?", "en")).toMatch(/baza de cunoștințe/i);
    expect(refusalText("Wie ist der Prozess?", "en")).toMatch(/Wissensdatenbank/i);
    expect(refusalText("What is the process?", null)).toMatch(/knowledge base/i);
  });
});

describe("grounded prompt", () => {
  it("pins the answer language and forbids outside knowledge", () => {
    const p = groundedSystemPrompt("[Document 1] SOP-1\nsteps", "ro");
    expect(p).toContain("Romanian (română) (code: ro)");
    expect(p).toMatch(/ONLY source of truth/);
    expect(p).toContain("SOP-1");
  });
});

describe("answer validation", () => {
  it("rejects an answer that drifted to another script", () => {
    expect(answerLanguageMismatch("Descărcarea marfei se procesează 遵循以下步骤：记录以下信息", "ro")).toBe(true);
  });

  it("rejects an answer written in the wrong Latin language", () => {
    expect(
      answerLanguageMismatch(
        "Das Fahrzeug muss vor der Abfahrt geprüft werden und der Fahrer ist dafür verantwortlich, dass alle Dokumente vorliegen.",
        "ro",
      ),
    ).toBe(true);
  });

  it("accepts an answer in the requested language", () => {
    expect(
      answerLanguageMismatch(
        "Descărcarea mărfii se face conform SOP-12: se verifică documentele și se confirmă recepția în sistem.",
        "ro",
      ),
    ).toBe(false);
  });

  it("rejects speculative answers", () => {
    expect(answerSpeculates("În general, poți contacta coordonatorul de dock.")).toBe(true);
    expect(answerSpeculates("Urmează pașii 1-3 din SOP-12.")).toBe(false);
  });

  it("needs strong evidence, not a loose FAQ word match", () => {
    expect(passesGrounding([{ type: "faq", confidence: "medium" }], 0.1)).toBe(false);
  });
});
