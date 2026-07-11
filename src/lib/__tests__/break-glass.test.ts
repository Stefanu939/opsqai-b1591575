import { describe, it, expect } from "vitest";
import { generateBreakGlassSecret, verifyBreakGlassSecret } from "@/lib/break-glass.server";

describe("break-glass secret", () => {
  it("verifies the plaintext it produced", () => {
    const { plaintext, hash } = generateBreakGlassSecret();
    expect(plaintext.length).toBeGreaterThan(20);
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyBreakGlassSecret(plaintext, hash)).toBe(true);
  });

  it("rejects wrong plaintext", () => {
    const { hash } = generateBreakGlassSecret();
    expect(verifyBreakGlassSecret("WRONG-SECRET-VALUE", hash)).toBe(false);
  });

  it("rejects malformed hash", () => {
    expect(verifyBreakGlassSecret("x", "not-a-hash")).toBe(false);
    expect(verifyBreakGlassSecret("x", null)).toBe(false);
    expect(verifyBreakGlassSecret("x", undefined)).toBe(false);
  });

  it("is case-insensitive on the plaintext (base32)", () => {
    const { plaintext, hash } = generateBreakGlassSecret();
    expect(verifyBreakGlassSecret(plaintext.toLowerCase(), hash)).toBe(true);
    expect(verifyBreakGlassSecret(`  ${plaintext}  `, hash)).toBe(true);
  });

  it("produces distinct secrets", () => {
    const a = generateBreakGlassSecret();
    const b = generateBreakGlassSecret();
    expect(a.plaintext).not.toEqual(b.plaintext);
    expect(a.hash).not.toEqual(b.hash);
  });
});
