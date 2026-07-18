// Wave E — Runtime guardrails for the Self-Hosted Cloud-module stub.
//
// The stub is aliased in place of every Cloud-only module during
// Self-Hosted builds. Any code path that survives tree-shaking and
// dereferences a Cloud SDK must fail loud and actionable, never
// silently return `undefined`.

import { describe, it, expect } from "vitest";
import * as stubMod from "@/lib/providers/stubs/cloud-stub";

describe("cloud-stub", () => {
  it("throws on property access", () => {
    expect(() => (stubMod.supabase as any).auth).toThrow(/Self-Hosted build/);
  });

  it("throws on function invocation", () => {
    expect(() => (stubMod.createClient as any)("url", "key")).toThrow(
      /Self-Hosted build/,
    );
  });

  it("throws on `new`", () => {
    expect(() => new (stubMod.createClient as any)()).toThrow(
      /Self-Hosted build/,
    );
  });

  it("exposes every Cloud named export as the same throwing stub", () => {
    const names = [
      "supabase",
      "supabaseAdmin",
      "createClient",
      "createSupabaseBrowserAuthProvider",
      "createSupabaseAuthProvider",
      "createSupabaseAuthAdminProvider",
      "createSupabaseStorageProvider",
      "getCloudSupabase",
      "getCloudSupabaseAdmin",
      "requireSupabaseAuth",
      "attachSupabaseAuth",
      "attachBearerToken",
      "bootstrapCloudProviders",
    ] as const;
    for (const n of names) {
      expect((stubMod as any)[n], `missing named export: ${n}`).toBeDefined();
      expect(() => ((stubMod as any)[n] as any).any).toThrow(/Self-Hosted/);
    }
  });

  it("mentions the gating remediation in the error message", () => {
    try {
      (stubMod.supabase as any).from("x");
    } catch (e) {
      expect((e as Error).message).toMatch(/platform mode|capabilities/i);
      return;
    }
    throw new Error("stub did not throw");
  });
});
