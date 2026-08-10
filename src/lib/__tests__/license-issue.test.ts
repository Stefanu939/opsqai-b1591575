import { describe, it, expect } from "vitest";
import { buildInstallLicenseRow, mapLicenseDbError } from "@/lib/license-issue";

describe("install license row", () => {
  const base = {
    install_id: "edeka-prod-01",
    company_name: "Edeka",
    contact_email: null,
    tier: "basic",
    seats: 50,
    expires_at: null,
    maintenance_expires_at: null,
    notes: null,
    signed_token: "jwt",
    issued_by: "user-1",
  };

  it("always issues kind=install with seats mirrored to max_users", () => {
    const row = buildInstallLicenseRow(base);
    expect(row.kind).toBe("install");
    expect(row.module_key).toBeNull();
    expect(row.max_users).toBe(50);
    expect(row.license_version).toBe(1);
  });

  it("clears revocation/suspension so a re-issue reactivates the install", () => {
    const row = buildInstallLicenseRow(base);
    expect(row.revoked).toBe(false);
    expect(row.suspended).toBe(false);
    expect(row.revoked_at).toBeNull();
  });

  it("defaults maintenance window to the license expiry", () => {
    const row = buildInstallLicenseRow({ ...base, expires_at: "2027-01-01T00:00:00.000Z" });
    expect(row.maintenance_expires_at).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("mapLicenseDbError", () => {
  it("translates the install_id unique violation", () => {
    const msg = mapLicenseDbError(
      'duplicate key value violates unique constraint "licenses_install_id_key"',
      "edeka-prod-01",
    );
    expect(msg).toContain("edeka-prod-01");
    expect(msg).not.toContain("duplicate key");
  });

  it("passes unrelated errors through", () => {
    expect(mapLicenseDbError("permission denied", "x")).toBe("permission denied");
  });
});
