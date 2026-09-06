import { describe, expect, it } from "vitest";
import { toIso, toIsoOrNull } from "../dates";

describe("selfhost date normalization", () => {
  it("converts Date values", () => {
    const d = new Date("2026-01-02T03:04:05.000Z");
    expect(toIso(d)).toBe("2026-01-02T03:04:05.000Z");
  });

  it("converts text timestamps returned by a mutated pg parser", () => {
    expect(toIso("2026-01-02T03:04:05.000Z")).toBe("2026-01-02T03:04:05.000Z");
    expect(toIso("2026-01-02 03:04:05+00")).toBe("2026-01-02T03:04:05.000Z");
  });

  it("keeps null-ish values null", () => {
    expect(toIsoOrNull(null)).toBeNull();
    expect(toIsoOrNull(undefined)).toBeNull();
    expect(toIsoOrNull("")).toBeNull();
    expect(toIsoOrNull(new Date(0))).toBe("1970-01-01T00:00:00.000Z");
  });
});
