import { describe, expect, it } from "vitest";
import { HeartbeatPayloadSchema } from "@/lib/selfhost-heartbeat-schema";

function basePayload() {
  return {
    installation_id: "opsqai-abc123",
    signed_token: "a".repeat(40),
    timestamp: new Date().toISOString(),
  };
}

describe("HeartbeatPayloadSchema", () => {
  it("accepts a minimal valid payload and fills in defaults", () => {
    const parsed = HeartbeatPayloadSchema.parse(basePayload());
    expect(parsed.status).toBe("running");
    expect(parsed.enabled_modules).toEqual([]);
  });

  it("accepts a fully populated payload", () => {
    const parsed = HeartbeatPayloadSchema.parse({
      ...basePayload(),
      organization_name: "Acme Corp",
      country: "DE",
      primary_language: "de",
      app_version: "1.4.0",
      license_status: "licensed",
      enabled_modules: ["faq", "academy"],
      status: "degraded",
      last_maintenance_at: new Date().toISOString(),
      next_maintenance_at: new Date().toISOString(),
    });
    expect(parsed.status).toBe("degraded");
    expect(parsed.enabled_modules).toEqual(["faq", "academy"]);
  });

  it("rejects a missing installation_id", () => {
    const { installation_id, ...rest } = basePayload();
    void installation_id;
    expect(HeartbeatPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a short signed_token", () => {
    expect(
      HeartbeatPayloadSchema.safeParse({ ...basePayload(), signed_token: "short" }).success,
    ).toBe(false);
  });

  it("rejects an invalid status enum value", () => {
    expect(
      HeartbeatPayloadSchema.safeParse({ ...basePayload(), status: "bogus" }).success,
    ).toBe(false);
  });

  it("rejects a non-datetime timestamp", () => {
    expect(
      HeartbeatPayloadSchema.safeParse({ ...basePayload(), timestamp: "not-a-date" }).success,
    ).toBe(false);
  });

  it("rejects an invalid license_status", () => {
    expect(
      HeartbeatPayloadSchema.safeParse({ ...basePayload(), license_status: "bogus" }).success,
    ).toBe(false);
  });
});
