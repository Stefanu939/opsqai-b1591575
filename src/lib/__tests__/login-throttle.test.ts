import { describe, it, expect } from "vitest";
import { throttleDelaySeconds } from "@/lib/providers/selfhost/local-auth.server";

describe("sign-in throttle backoff", () => {
  it("does not delay the first three attempts", () => {
    expect(throttleDelaySeconds(0)).toBe(0);
    expect(throttleDelaySeconds(1)).toBe(0);
    expect(throttleDelaySeconds(3)).toBe(0);
  });

  it("backs off exponentially after the free attempts", () => {
    expect(throttleDelaySeconds(4)).toBe(2);
    expect(throttleDelaySeconds(5)).toBe(4);
    expect(throttleDelaySeconds(6)).toBe(8);
    expect(throttleDelaySeconds(7)).toBe(16);
  });

  it("caps the backoff before the hard lockout", () => {
    expect(throttleDelaySeconds(9)).toBeLessThanOrEqual(300);
  });

  it("hard-locks at ten failures for fifteen minutes", () => {
    expect(throttleDelaySeconds(10)).toBe(900);
    expect(throttleDelaySeconds(50)).toBe(900);
  });
});
