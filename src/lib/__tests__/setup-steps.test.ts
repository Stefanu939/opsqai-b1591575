import { describe, it, expect } from "vitest";
import {
  SETUP_STEPS,
  computeSetupComplete,
  isRequiredStep,
  type SetupStepId,
} from "@/lib/setup-steps";

const allRequiredIds = (mode: "cloud" | "selfhost"): SetupStepId[] =>
  SETUP_STEPS.filter((s) => isRequiredStep(s, mode)).map((s) => s.id);

describe("setup-steps catalog", () => {
  it("has unique step ids", () => {
    const ids = SETUP_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cloud mode is complete when every non-selfhost, non-soft step is done", () => {
    const required = allRequiredIds("cloud");
    expect(computeSetupComplete(required, "cloud")).toBe(true);
    expect(required).not.toContain("license_imported");
  });

  it("selfhost mode requires the Installation License step", () => {
    const required = allRequiredIds("selfhost");
    expect(required).toContain("license_imported");
    expect(computeSetupComplete(required, "selfhost")).toBe(true);
    // Missing license → not complete
    const withoutLicense = required.filter((id) => id !== "license_imported");
    expect(computeSetupComplete(withoutLicense, "selfhost")).toBe(false);
  });

  it("soft steps do not block completion", () => {
    const softIds = SETUP_STEPS.filter((s) => s.soft).map((s) => s.id);
    expect(softIds.length).toBeGreaterThan(0);
    const required = allRequiredIds("selfhost");
    // Complete without any soft step done → still complete.
    expect(computeSetupComplete(required, "selfhost")).toBe(true);
    // Even if we add every soft step, still complete.
    expect(computeSetupComplete([...required, ...softIds], "selfhost")).toBe(true);
  });

  it("empty progress is never complete", () => {
    expect(computeSetupComplete([], "cloud")).toBe(false);
    expect(computeSetupComplete([], "selfhost")).toBe(false);
  });

  it("unknown step ids are ignored for completion", () => {
    expect(computeSetupComplete(["not_a_real_step"], "cloud")).toBe(false);
  });
});
