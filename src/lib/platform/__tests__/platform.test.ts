import { describe, it, expect, beforeEach } from "vitest";
import {
  Capability,
  Edition,
  PlatformMode,
  atLeastEdition,
  getActiveEdition,
  getPlatformMode,
  hasCapability,
  listActiveCapabilities,
  registerCapabilities,
  registerCapability,
  setActiveEdition,
  unregisterCapability,
} from "@/lib/platform";
import { __resetCapabilitiesForTests } from "@/lib/platform/capabilities";
import { __resetEditionForTests } from "@/lib/platform/edition";
import { __resetPlatformModeForTests } from "@/lib/platform/mode";

beforeEach(() => {
  __resetCapabilitiesForTests();
  __resetEditionForTests();
  __resetPlatformModeForTests();
});

describe("capabilities", () => {
  it("registers, queries, and unregisters", () => {
    expect(hasCapability(Capability.SSO)).toBe(false);
    registerCapability(Capability.SSO);
    expect(hasCapability(Capability.SSO)).toBe(true);
    unregisterCapability(Capability.SSO);
    expect(hasCapability(Capability.SSO)).toBe(false);
  });

  it("registers batches idempotently and lists sorted", () => {
    registerCapabilities([Capability.AI, Capability.Storage, Capability.AI]);
    expect(listActiveCapabilities()).toEqual([Capability.AI, Capability.Storage].sort());
  });
});

describe("edition", () => {
  it("defaults to Community", () => {
    expect(getActiveEdition()).toBe(Edition.Community);
    expect(atLeastEdition(Edition.Professional)).toBe(false);
  });

  it("respects ordering Community < Professional < Enterprise", () => {
    setActiveEdition(Edition.Professional);
    expect(atLeastEdition(Edition.Community)).toBe(true);
    expect(atLeastEdition(Edition.Professional)).toBe(true);
    expect(atLeastEdition(Edition.Enterprise)).toBe(false);

    setActiveEdition(Edition.Enterprise);
    expect(atLeastEdition(Edition.Enterprise)).toBe(true);
  });
});

describe("platform mode", () => {
  it("defaults to Cloud when no signal is present", () => {
    expect(getPlatformMode()).toBe(PlatformMode.Cloud);
  });
});
