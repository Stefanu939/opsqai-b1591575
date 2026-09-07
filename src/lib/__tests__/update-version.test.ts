import { describe, expect, it } from "vitest";
import { isNewerVersion, satisfiesMinVersion } from "@/lib/update-version";

describe("isNewerVersion", () => {
  it("compares numeric segments", () => {
    expect(isNewerVersion("1.4.0", "1.3.9")).toBe(true);
    expect(isNewerVersion("1.3.9", "1.4.0")).toBe(false);
    expect(isNewerVersion("1.4.0", "1.4.0")).toBe(false);
  });

  it("treats a missing segment as zero", () => {
    expect(isNewerVersion("1.4.1", "1.4")).toBe(true);
    expect(isNewerVersion("1.4", "1.4.0")).toBe(false);
  });

  it("ignores a leading v", () => {
    expect(isNewerVersion("v2.0.0", "1.9.9")).toBe(true);
  });
});

describe("satisfiesMinVersion", () => {
  it("accepts anything when no minimum is set", () => {
    expect(satisfiesMinVersion("1.0.0", null)).toBe(true);
  });

  it("blocks installations older than the minimum", () => {
    expect(satisfiesMinVersion("1.2.0", "1.3.0")).toBe(false);
    expect(satisfiesMinVersion("1.3.0", "1.3.0")).toBe(true);
    expect(satisfiesMinVersion("1.4.0", "1.3.0")).toBe(true);
  });
});
