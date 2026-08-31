import { describe, expect, it } from "vitest";
import { buildAppNavigation, productsWithNavigation, type NavEntry } from "@/lib/app-navigation";
import {
  PRODUCT_WORKSPACES,
  PRODUCT_KEYS,
  CORE_CAPABILITY_KEYS,
  findWorkspace,
  getProduct,
  implementedWorkspacesForProduct,
  resolveProductWorkspaces,
  workspacesForProduct,
} from "@/lib/product-architecture";

const coreItems: NavEntry[] = [
  { to: "/app", label: "Dashboard", icon: "Home", module: null },
  { to: "/app/chat", label: "AI Chat", icon: "MessageSquare", module: "chat" },
  { to: "/app/users", label: "Users", icon: "Users", module: null, show: false },
];

describe("product workspace model", () => {
  it("declares workspaces for every product in the catalogue", () => {
    for (const key of PRODUCT_KEYS) {
      expect(workspacesForProduct(key).length, key).toBeGreaterThan(0);
    }
  });

  it("uses unique workspace keys", () => {
    const keys = PRODUCT_WORKSPACES.map((w) => w.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never marks a workspace implemented without a real route", () => {
    for (const w of PRODUCT_WORKSPACES) {
      if (w.status === "implemented") expect(w.route, w.key).toBeTruthy();
      if (w.status === "planned") expect(w.route, w.key).toBeUndefined();
    }
  });

  it("resolves workspaces only for explicitly enabled products", () => {
    expect(resolveProductWorkspaces({ profile: "logistics" })).toEqual([]);
    const resolved = resolveProductWorkspaces({
      profile: "logistics",
      enabledProducts: ["opsqai_logistics"],
    });
    expect(resolved).toHaveLength(1);
    expect(resolved[0].product.key).toBe("opsqai_logistics");
    expect(resolved[0].workspaces.length).toBeGreaterThan(0);
    expect(resolved[0].implemented).toEqual(implementedWorkspacesForProduct("opsqai_logistics"));
  });
});

describe("buildAppNavigation", () => {
  it("returns core only when no products are enabled", () => {
    const groups = buildAppNavigation({ coreItems, coreLabel: "Workspace" });
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe("core");
    expect(groups[0].items.map((i) => i.to)).toEqual(["/app", "/app/chat"]);
  });

  it("hides core entries denied by the caller's gate", () => {
    const groups = buildAppNavigation({
      coreItems,
      gate: (i) => i.module !== "chat",
    });
    expect(groups[0].items.map((i) => i.to)).toEqual(["/app"]);
  });

  it("never emits an empty group", () => {
    const groups = buildAppNavigation({
      coreItems,
      enabledProducts: [...PRODUCT_KEYS],
    });
    for (const g of groups) expect(g.items.length).toBeGreaterThan(0);
  });

  it("only groups products that ship at least one implemented workspace", () => {
    const groups = buildAppNavigation({
      coreItems,
      enabledProducts: ["opsqai_logistics"],
    });
    const productGroups = groups.filter((g) => g.id !== "core");
    expect(productGroups.map((g) => g.id)).toEqual(
      productsWithNavigation({ enabledProducts: ["opsqai_logistics"] }),
    );
  });

  it("drops product groups when the product is not enabled", () => {
    const enabled = buildAppNavigation({ coreItems, enabledProducts: [...PRODUCT_KEYS] });
    const disabled = buildAppNavigation({ coreItems });
    expect(disabled.filter((g) => g.id !== "core")).toEqual([]);
    expect(enabled.filter((g) => g.id !== "core").length).toBe(
      productsWithNavigation({ enabledProducts: [...PRODUCT_KEYS] }).length,
    );
  });
});

describe("real product workspaces", () => {
  it("gives every product at least one implemented workspace with a routed URL", () => {
    for (const key of PRODUCT_KEYS) {
      const impl = implementedWorkspacesForProduct(key);
      expect(impl.length, key).toBeGreaterThan(0);
      for (const w of impl) {
        expect(w.route, w.key).toMatch(/^\/app\/products\/[a-z]+\/[a-z-]+$/);
      }
    }
  });

  it("resolves a workspace from its route params and rejects unknown ones", () => {
    const found = findWorkspace("logistics", "overview");
    expect(found?.product.key).toBe("opsqai_logistics");
    expect(found?.workspace.status).toBe("implemented");
    expect(findWorkspace("logistics", "nope")).toBeNull();
    expect(findWorkspace("nope", "overview")).toBeNull();
  });

  it("includes the cross-industry Operations product", () => {
    expect(PRODUCT_KEYS).toContain("opsqai_operations");
    expect(getProduct("opsqai_operations")?.status).toBe("available");
    expect(implementedWorkspacesForProduct("opsqai_operations").length).toBeGreaterThan(0);
  });

  it("builds one navigation group per enabled product, never for a profile alone", () => {
    const profileOnly = buildAppNavigation({ coreItems, profile: "enterprise_operations" });
    expect(profileOnly.filter((g) => g.id !== "core")).toEqual([]);

    const groups = buildAppNavigation({
      coreItems,
      profile: "enterprise_operations",
      enabledProducts: ["opsqai_operations", "opsqai_hr"],
    });
    expect(groups.map((g) => g.id)).toEqual(["core", "opsqai_operations", "opsqai_hr"]);
  });

  it("only surfaces Core capabilities as domain context, never re-classified", () => {
    for (const w of PRODUCT_WORKSPACES) {
      for (const c of w.coreCapabilities ?? []) {
        expect(CORE_CAPABILITY_KEYS as readonly string[], `${w.key}/${c}`).toContain(c);
      }
    }
  });
});
