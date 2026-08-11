import { describe, expect, it } from "vitest";
import {
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
    expect(passesGrounding([{ type: "document", similarity: 0.12 }], 0.12)).toBe(false);
  });

  it("allows document evidence above the similarity threshold", () => {
    expect(passesGrounding([{ type: "document", similarity: 0.41 }], 0.41)).toBe(true);
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
    expect(p).toContain("Answer in this language: ro");
    expect(p).toMatch(/ONLY source of truth/);
    expect(p).toContain("SOP-1");
  });
});
