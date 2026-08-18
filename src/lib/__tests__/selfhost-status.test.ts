import { describe, expect, it } from "vitest";
import { deriveInstallationStatus } from "@/lib/selfhost-status";

describe("deriveInstallationStatus", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");

  it("returns unknown when no heartbeat ever received", () => {
    expect(deriveInstallationStatus({ lastHeartbeatAt: null, now })).toBe("unknown");
  });

  it("returns unknown for an unparseable timestamp", () => {
    expect(deriveInstallationStatus({ lastHeartbeatAt: "not-a-date", now })).toBe("unknown");
  });

  it("returns unknown after 7 days of silence", () => {
    const last = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
    expect(deriveInstallationStatus({ lastHeartbeatAt: last, now })).toBe("unknown");
  });

  it("returns offline after missing 3 heartbeat intervals", () => {
    const intervalMs = 60_000;
    const last = new Date(now - intervalMs * 4).toISOString();
    expect(deriveInstallationStatus({ lastHeartbeatAt: last, now, heartbeatIntervalMs: intervalMs })).toBe(
      "offline",
    );
  });

  it("returns online for a recent 'running' heartbeat", () => {
    const last = new Date(now - 1000).toISOString();
    expect(
      deriveInstallationStatus({ lastHeartbeatAt: last, reportedStatus: "running", now }),
    ).toBe("online");
  });

  it("maps degraded/updating/maintenance through when recent", () => {
    const last = new Date(now - 1000).toISOString();
    expect(deriveInstallationStatus({ lastHeartbeatAt: last, reportedStatus: "degraded", now })).toBe(
      "degraded",
    );
    expect(deriveInstallationStatus({ lastHeartbeatAt: last, reportedStatus: "updating", now })).toBe(
      "updating",
    );
    expect(
      deriveInstallationStatus({ lastHeartbeatAt: last, reportedStatus: "maintenance", now }),
    ).toBe("maintenance");
  });

  it("defaults to running/online when reportedStatus is missing", () => {
    const last = new Date(now - 1000).toISOString();
    expect(deriveInstallationStatus({ lastHeartbeatAt: last, now })).toBe("online");
  });
});
