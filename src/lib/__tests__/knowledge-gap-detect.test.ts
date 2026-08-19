import { describe, expect, it } from "vitest";
import {
  detectGapSignal,
  normalizeGapQuestion,
  resolveAnswerLanguage,
} from "@/lib/chat-grounding";

describe("automatic knowledge gap detection", () => {
  it("flags a question with no retrieved source", () => {
    expect(detectGapSignal({ sources: [], confidence: 0, grounded: false })).toEqual({
      isGap: true,
      reason: "no_source",
    });
  });

  it("flags weak evidence that failed the grounding gate", () => {
    const s = detectGapSignal({
      sources: [{ type: "document", similarity: 0.2 }],
      confidence: 0.2,
      grounded: false,
    });
    expect(s).toEqual({ isGap: true, reason: "low_confidence" });
  });

  it("flags an answer that admits missing documentation", () => {
    const s = detectGapSignal({
      sources: [{ type: "document", similarity: 0.7 }],
      confidence: 0.7,
      grounded: true,
      answerText: "Pasul de aprobare nu este documentat în SOP-ul disponibil.",
    });
    expect(s).toEqual({ isGap: true, reason: "partial_answer" });
  });

  it("does not flag a well-supported answer", () => {
    expect(
      detectGapSignal({
        sources: [{ type: "document", similarity: 0.72 }],
        confidence: 0.72,
        grounded: true,
        answerText: "Urmează pașii 1-3 din SOP-12.",
      }),
    ).toEqual({ isGap: false });
  });

  it("normalizes questions so near-duplicates dedup", () => {
    expect(normalizeGapQuestion("  Care e   procedura?? ")).toBe("care e procedura");
  });
});

describe("answer language resolution", () => {
  it("uses the current user message language over the interface hint", () => {
    expect(resolveAnswerLanguage(["Care este procedura de returnare?"], "en")).toBe("ro");
  });

  it("falls back to the conversation language for very short turns", () => {
    expect(resolveAnswerLanguage(["Wie funktioniert der Prozess genau?", "ok"], "en")).toBe("de");
  });

  it("falls back to the hint with no usable text", () => {
    expect(resolveAnswerLanguage([], "de")).toBe("de");
  });
});
