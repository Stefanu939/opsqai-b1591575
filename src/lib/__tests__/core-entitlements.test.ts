import { describe, expect, it } from "vitest";
import { CORE_CAPABILITY_KEYS } from "@/lib/product-architecture";
import { effectiveModules } from "@/lib/license-modules";

describe("Core capability entitlements", () => {
  it("keeps every Core function active for legacy licenses", () => {
    const modules = effectiveModules([]);
    expect(modules).toContain("chat");
    expect(modules).toContain("academy");
  });

  it("honors an explicit Core allowlist", () => {
    const modules = effectiveModules([], ["chat", "reports"]);
    expect(modules).toContain("chat");
    expect(modules).toContain("reports");
    expect(modules).not.toContain("academy");
  });

  it("derives included functions from their Core parent", () => {
    const modules = effectiveModules([], ["reports", "sop_versioning"]);
    expect(modules).toContain("analytics");
    expect(modules).toContain("executive_dashboard");
    expect(modules).toContain("ai_sop_generator");
    expect(modules).not.toContain("brand_center");
  });

  it("accepts the complete canonical Core list for new licenses", () => {
    const modules = effectiveModules([], [...CORE_CAPABILITY_KEYS]);
    for (const capability of CORE_CAPABILITY_KEYS) expect(modules).toContain(capability);
  });
});