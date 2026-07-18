// Wave E — Runtime guardrails for the Cloud-only accessor helpers.
//
// `getCloudSupabase` and `getCloudSupabaseAdmin` are the single choke-points
// through which Cloud-only server functions reach Supabase. On Self-Hosted
// they MUST throw `FeatureNotAvailableError` before touching any Cloud
// module, and never before importing `@/integrations/supabase/client.server`.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  FeatureNotAvailableError,
  getCloudSupabase,
  getCloudSupabaseAdmin,
  notAvailable,
} from "@/lib/providers/not-available";
import { PlatformMode } from "@/lib/platform/types";

// Spy on getPlatformMode so we can flip mode per test without touching
// process.env / window.
import * as modeMod from "@/lib/platform/mode";

describe("not-available", () => {
  let getMode: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getMode = vi.spyOn(modeMod, "getPlatformMode");
  });

  afterEach(() => {
    getMode.mockRestore();
  });

  it("notAvailable() throws FeatureNotAvailableError with the feature name", () => {
    try {
      notAvailable("workspace");
    } catch (e) {
      expect(e).toBeInstanceOf(FeatureNotAvailableError);
      expect((e as FeatureNotAvailableError).feature).toBe("workspace");
      expect((e as FeatureNotAvailableError).code).toBe(
        "FEATURE_NOT_AVAILABLE_SELFHOST",
      );
      return;
    }
    throw new Error("notAvailable did not throw");
  });

  it("getCloudSupabase returns context.supabase on Cloud", () => {
    getMode.mockReturnValue(PlatformMode.Cloud);
    const marker = { __cloud: true };
    expect(getCloudSupabase({ supabase: marker }, "mc-admin")).toBe(marker);
  });

  it("getCloudSupabase throws on Self-Hosted", () => {
    getMode.mockReturnValue(PlatformMode.SelfHosted);
    expect(() =>
      getCloudSupabase({ supabase: {} }, "mc-admin"),
    ).toThrow(FeatureNotAvailableError);
  });

  it("getCloudSupabaseAdmin throws on SH BEFORE importing client.server", async () => {
    getMode.mockReturnValue(PlatformMode.SelfHosted);
    await expect(getCloudSupabaseAdmin("mc-admin")).rejects.toBeInstanceOf(
      FeatureNotAvailableError,
    );
  });
});
