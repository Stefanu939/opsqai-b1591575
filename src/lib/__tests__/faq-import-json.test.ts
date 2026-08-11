import { describe, it, expect } from "vitest";
import { extractFaqItems } from "@/lib/faq-import-json";

describe("extractFaqItems", () => {
  it("parses strict JSON", () => {
    const out = extractFaqItems('{"items":[{"question":"Q","answer":"A","category":"ops"}]}');
    expect(out).toEqual([{ question: "Q", answer: "A", category: "ops" }]);
  });

  it("handles markdown fences and commentary", () => {
    const raw = 'Sure! Here you go:\n```json\n{"items":[{"question":"Q1","answer":"A1"}]}\n```\nDone.';
    expect(extractFaqItems(raw)).toEqual([{ question: "Q1", answer: "A1", category: "general" }]);
  });

  it("handles trailing commas", () => {
    const out = extractFaqItems('{"items":[{"question":"Q","answer":"A",},]}');
    expect(out).toHaveLength(1);
  });

  it("accepts a bare array and alternate keys", () => {
    const out = extractFaqItems('[{"frage":"Wie?","antwort":"So.","kategorie":"allgemein"}]');
    expect(out).toEqual([{ question: "Wie?", answer: "So.", category: "allgemein" }]);
  });

  it("accepts multiple pairs and trailing prose", () => {
    const raw =
      '{"faqs":[{"q":"1","a":"one"},{"q":"2","a":"two"}]} — hope this helps!';
    expect(extractFaqItems(raw)).toHaveLength(2);
  });

  it("returns empty for valid JSON without pairs", () => {
    expect(extractFaqItems('{"items":[]}')).toEqual([]);
  });

  it("throws on empty or non-JSON responses", () => {
    expect(() => extractFaqItems("")).toThrow();
    expect(() => extractFaqItems("I could not find any questions.")).toThrow();
  });
});
