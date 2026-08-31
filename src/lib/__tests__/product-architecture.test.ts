import { describe, expect, it } from "vitest";
import {
  ADDON_KEYS,
  CORE_CAPABILITIES,
  CORE_CAPABILITY_KEYS,
  COMPANY_PROFILES,
  LEGACY_INCLUDED_MODULE_KEYS,
  LEGACY_MODULE_MAP,
  PRODUCT_CATALOG,
  canonicalKey,
  classify,
  classifyLegacy,
  getCompanyProfile,
  productsAvailableFor,
  productsRecommendedFor,
  resolveEffectiveConfig,
} from "@/lib/product-architecture";
import { BASIC_MODULES, LICENSE_MODULE_CATALOG, CORE_MODULE_KEYS } from "@/lib/license-modules";
import { FEATURE_CATALOG, featureClassification } from "@/lib/feature-catalog";

describe("classification", () => {
  it("classifies core, product and addon keys", () => {
    expect(classify("rbac")).toBe("core");
    expect(classify("internal_chat")).toBe("core");
    expect(classify("opsqai_transport")).toBe("product");
    expect(classify("brand_center")).toBe("addon");
    expect(classify("nope")).toBe("unknown");
  });

  it("keeps core and addon key spaces disjoint", () => {
    for (const k of ADDON_KEYS) {
      expect(CORE_CAPABILITY_KEYS as readonly string[]).not.toContain(k);
    }
  });

  it("has no duplicate core capability keys", () => {
    expect(new Set(CORE_CAPABILITY_KEYS).size).toBe(CORE_CAPABILITIES.length);
  });

  it("declares the ten explicitly-Core platform capabilities", () => {
    for (const k of [
      "rbac",
      "compliance_center",
      "enterprise_export",
      "sop_versioning",
      "internal_requests",
      "reports",
      "support_center",
      "multi_language",
      "workspace_health",
      "internal_chat",
    ]) {
      expect(classify(k)).toBe("core");
    }
  });
});

describe("legacy compatibility mapping", () => {
  it("maps every legacy license module key", () => {
    for (const m of LICENSE_MODULE_CATALOG) {
      expect(LEGACY_MODULE_MAP[m.key], m.key).toBeDefined();
      expect(classifyLegacy(m.key), m.key).not.toBe("unknown");
    }
  });

  it("maps every legacy Feature Matrix key", () => {
    for (const f of FEATURE_CATALOG) {
      expect(featureClassification(f.key), f.key).not.toBe("unknown");
    }
  });

  it("resolves legacy aliases to canonical keys", () => {
    expect(canonicalKey("ai_assistant")).toBe("chat");
    expect(canonicalKey("knowledge_base")).toBe("kb");
    expect(canonicalKey("workspace_isolation")).toBe("rbac");
    expect(canonicalKey("ai_workspace")).toBe("ai_workspace_audit");
  });

  it("keeps the legacy included module set unchanged (no gating change)", () => {
    expect([...BASIC_MODULES].sort()).toEqual([...LEGACY_INCLUDED_MODULE_KEYS].sort());
    expect(BASIC_MODULES).toHaveLength(9);
  });

  it("exposes core module keys beyond the legacy included set", () => {
    expect(CORE_MODULE_KEYS).toContain("rbac");
    expect(CORE_MODULE_KEYS).toContain("reports");
    expect(CORE_MODULE_KEYS).not.toContain("analytics");
  });
});

describe("company profiles vs products", () => {
  it("never treats a profile as an activation of products", () => {
    const cfg = resolveEffectiveConfig({ profile: "logistics" });
    expect(cfg.products).toEqual([]);
  });

  it("recommends without granting", () => {
    expect(productsRecommendedFor("transport")).toContain("opsqai_transport");
    const cfg = resolveEffectiveConfig({ profile: "transport" });
    expect(cfg.products).not.toContain("opsqai_transport");
  });

  it("only lists known products as available", () => {
    for (const p of COMPANY_PROFILES) {
      for (const k of p.availableProducts) {
        expect(PRODUCT_CATALOG.some((x) => x.key === k), `${p.key}/${k}`).toBe(true);
      }
      for (const k of p.recommendedProducts) {
        expect(p.availableProducts).toContain(k);
      }
    }
  });

  it("falls back to the default profile for unknown values", () => {
    expect(getCompanyProfile("does-not-exist").key).toBe("logistics");
    expect(productsAvailableFor(null).length).toBeGreaterThan(0);
  });
});

describe("resolveEffectiveConfig", () => {
  it("always includes core and only explicit products/addons", () => {
    const cfg = resolveEffectiveConfig({
      profile: "logistics",
      enabledProducts: ["opsqai_logistics", "opsqai_hr", "bogus"],
      entitlements: ["analytics", "rbac", "bogus"],
    });
    expect(cfg.coreCapabilities).toEqual(CORE_CAPABILITY_KEYS);
    expect(cfg.products).toEqual(["opsqai_logistics", "opsqai_hr"]);
    expect(cfg.addons).toEqual(["analytics"]);
    expect(cfg.productCapabilities).toContain("logistics_workspace");
    expect(cfg.productCapabilities).toContain("hr_workspace");
    expect(cfg.capabilities).toContain("rbac");
    expect(cfg.capabilities).not.toContain("bogus");
  });

  it("supports several products for one company", () => {
    const cfg = resolveEffectiveConfig({
      profile: "logistics",
      enabledProducts: ["opsqai_logistics", "opsqai_finance", "opsqai_logistics"],
    });
    expect(cfg.products).toEqual(["opsqai_logistics", "opsqai_finance"]);
  });

  it("returns core-only for an empty input", () => {
    const cfg = resolveEffectiveConfig();
    expect(cfg.capabilities).toEqual([...CORE_CAPABILITY_KEYS]);
  });
});
