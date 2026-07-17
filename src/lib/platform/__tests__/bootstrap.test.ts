import { describe, it, expect, beforeEach } from "vitest";
import { Capability, PlatformMode, defaultCapabilitiesFor, hasCapability } from "@/lib/platform";
import { bootstrapPlatform } from "@/lib/platform/bootstrap";
import { runHealthCheck } from "@/lib/platform/health";
import { runDoctor } from "@/lib/platform/doctor";
import {
  NoopBackupService,
  NoopTelemetrySink,
  NullCipher,
  __resetProviderRegistryForTests,
} from "@/lib/providers";
import type {
  IAuthProvider,
  ILicensingProvider,
  INotificationProvider,
  IStorageProvider,
  IUserRepository,
} from "@/lib/providers";
import { __resetCapabilitiesForTests } from "@/lib/platform/capabilities";

const fakeAuth: IAuthProvider = {
  capability: Capability.Authentication,
  name: "fake-auth",
  async signIn() { throw new Error("nyi"); },
  async signOut() {},
  async refresh() { throw new Error("nyi"); },
  async requestPasswordReset() {},
  async confirmPasswordReset() {},
  async verifyAccessToken() { return { userId: "u", email: null, claims: {} }; },
};
const fakeUsers: IUserRepository = {
  async findById() { return null; },
  async findByEmail() { return null; },
  async createFirstAdmin() { throw new Error("nyi"); },
  async disable() {},
};
const fakeStorage: IStorageProvider = {
  capability: Capability.Storage,
  name: "fake-storage",
  async put() { throw new Error("nyi"); },
  async get() { throw new Error("nyi"); },
  async delete() {},
  async head() { return null; },
  async probe() { return { ok: true }; },
};
const fakeNotifications: INotificationProvider = {
  capability: Capability.SMTP,
  name: "fake-smtp",
  async sendEmail() {},
  async sendTestEmail() {},
};
const fakeLicensing: ILicensingProvider = {
  capability: Capability.Licensing,
  name: "fake-license",
  async validate() {
    return {
      customer: "ACME",
      seats: 10,
      expiresAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
      supportLevel: "gold",
      channel: "stable",
      edition: "professional",
      featureFlags: {},
    };
  },
  async heartbeat() { return { ok: true }; },
  async latestRelease() { return null; },
};

beforeEach(() => {
  __resetProviderRegistryForTests();
  __resetCapabilitiesForTests();
  bootstrapPlatform({
    auth: fakeAuth,
    users: fakeUsers,
    storage: fakeStorage,
    notifications: fakeNotifications,
    licensing: fakeLicensing,
    cipher: new NullCipher(),
    backup: new NoopBackupService(),
    telemetry: new NoopTelemetrySink(),
    capabilities: [Capability.Storage, Capability.Licensing],
  });
});

describe("bootstrap", () => {
  it("registers capabilities from the bootstrap descriptor", () => {
    expect(hasCapability(Capability.Storage)).toBe(true);
    expect(hasCapability(Capability.Licensing)).toBe(true);
    expect(hasCapability(Capability.SSO)).toBe(false);
  });

  it("exposes sensible defaults per mode", () => {
    expect(defaultCapabilitiesFor(PlatformMode.Cloud)).toContain(Capability.SSO);
    expect(defaultCapabilitiesFor(PlatformMode.SelfHosted)).toContain(Capability.OfflineMode);
    expect(defaultCapabilitiesFor(PlatformMode.SelfHosted)).not.toContain(Capability.SSO);
  });
});

describe("health check", () => {
  it("returns ok when all providers pass their probes", async () => {
    const report = await runHealthCheck();
    expect(report.overall).toBe("ok");
    expect(report.checks.find((c) => c.id === "storage.probe")?.status).toBe("ok");
    expect(report.checks.find((c) => c.id === "license.valid")?.status).toBe("ok");
  });
});

describe("doctor", () => {
  it("returns green when license and edition are healthy", async () => {
    const report = await runDoctor();
    expect(report.overall).toBe("green");
    expect(report.findings.find((f) => f.id === "license.expiry")?.severity).toBe("green");
  });
});
