import { describe, it, expect } from "vitest";
import {
  isRouteAllowedInMode,
  MC_ONLY_PREFIXES,
  SELFHOST_ONLY_PREFIXES,
  OPERATIONAL_PREFIXES,
} from "@/lib/deployment-mode";

describe("deployment-mode route gate", () => {
  it("allows shared routes in both modes", () => {
    for (const p of ["/", "/app", "/app/profile", "/app/index"]) {
      expect(isRouteAllowedInMode(p, "mc").allowed).toBe(true);
      expect(isRouteAllowedInMode(p, "selfhost").allowed).toBe(true);
    }
  });

  it("denies MC-only routes when running as selfhost", () => {
    for (const prefix of MC_ONLY_PREFIXES) {
      const verdict = isRouteAllowedInMode(`${prefix}/anything`, "selfhost");
      expect(verdict.allowed).toBe(false);
      expect(verdict.reason).toBe("mc_only_route_on_selfhost");
    }
  });

  it("denies self-host-only routes when running as mc", () => {
    for (const prefix of SELFHOST_ONLY_PREFIXES) {
      const verdict = isRouteAllowedInMode(prefix, "mc");
      expect(verdict.allowed).toBe(false);
      expect(verdict.reason).toBe("selfhost_only_route_on_mc");
    }
  });

  it("denies operational routes on the MC", () => {
    for (const prefix of OPERATIONAL_PREFIXES) {
      const verdict = isRouteAllowedInMode(`${prefix}/whatever`, "mc");
      expect(verdict.allowed).toBe(false);
      expect(verdict.reason).toBe("operational_on_mc");
    }
  });

  it("allows operational routes on selfhost", () => {
    for (const prefix of OPERATIONAL_PREFIXES) {
      expect(isRouteAllowedInMode(prefix, "selfhost").allowed).toBe(true);
    }
  });

  it("matches whole path segments only (no prefix collisions)", () => {
    // "/app/knowledgebase-x" should NOT match "/app/knowledge".
    expect(isRouteAllowedInMode("/app/knowledgebase-x", "mc").allowed).toBe(true);
    // But the prefix itself and any child DO match.
    expect(isRouteAllowedInMode("/app/knowledge", "mc").allowed).toBe(false);
    expect(isRouteAllowedInMode("/app/knowledge/foo", "mc").allowed).toBe(false);
  });

  it("MC-only and self-host-only prefix sets do not overlap", () => {
    const mc = new Set(MC_ONLY_PREFIXES);
    for (const p of SELFHOST_ONLY_PREFIXES) expect(mc.has(p)).toBe(false);
  });
});
