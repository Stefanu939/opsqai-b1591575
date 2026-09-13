import { describe, expect, it } from "vitest";
import { CORE_CAPABILITY_KEYS } from "@/lib/product-architecture";
import { effectiveModules } from "@/lib/license-modules";

describe("Core capability entitlements", () => {
  it("keeps every Core function active for legacy licenses", () => {
    const modules = effectiveModules([]);
    expect(modules).toContain("chat");
    expect(modules).toContain("academy");
    // Regression: pre-capability licenses must not lose these Core surfaces.
    expect(modules).toContain("rbac");
    expect(modules).toContain("workspace_health");
    expect(modules).toContain("internal_requests");
    expect(modules).toContain("reports");
  });

  it("keeps Core available on an expired license while add-ons stay blocked", () => {
    const expired = {
      mode: "selfhost" as const,
      unlimited: false,
      revoked: true,
      modules: [] as never[],
    } as unknown as Parameters<typeof hasModule>[0];
    expect(hasModule(expired, "workspace_health")).toBe(true);
    expect(hasModule(expired, "rbac")).toBe(true);
    expect(hasModule(expired, "internal_requests")).toBe(true);
    expect(hasModule(expired, "brand_center")).toBe(false);
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