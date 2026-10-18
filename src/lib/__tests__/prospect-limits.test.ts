import { describe, expect, it } from "vitest";
import { prospectGate, prospectRemaining } from "@/lib/prospect-limits";

describe("prospect chat limits", () => {
  it("lets anonymous visitors ask 2 questions", () => {
    expect(prospectGate(0, false)).toBe("ok");
    expect(prospectGate(1, false)).toBe("ok");
  });
  it("requires sign-in for the 3rd question", () => {
    expect(prospectGate(2, false)).toBe("login_required");
  });
  it("continues the same session after sign-in", () => {
    expect(prospectGate(2, true)).toBe("ok");
  });
  it("stops at 30 messages per session", () => {
    expect(prospectGate(29, true)).toBe("ok");
    expect(prospectGate(30, true)).toBe("limit_reached");
    expect(prospectRemaining(27)).toBe(3);
  });
});
