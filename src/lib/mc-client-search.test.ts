import { describe, expect, it } from "vitest";
import { matchesClient, sameCompany } from "./mc-client-search";

describe("MC client matching", () => {
  it("matches multiple fields without accents or punctuation", () => {
    expect(matchesClient("stefan 1234", ["Ștefan", "CUI: 123456"])).toBe(true);
    expect(matchesClient("stefan 999", ["Ștefan", "CUI: 123456"])).toBe(false);
  });
  it("recognizes legal-name variants without merging different companies", () => {
    expect(sameCompany("SC Pirelli România SRL", "Pirelli Romania")).toBe(true);
    expect(sameCompany("Pirelli", "Pirelli Logistics")).toBe(false);
    expect(sameCompany("", "SRL")).toBe(false);
  });
});