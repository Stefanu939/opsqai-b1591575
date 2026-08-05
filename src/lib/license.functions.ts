// License entitlements server function.
//
// Thin wrapper around ILicensingProvider.entitlements() so the browser can
// resolve which modules are unlocked without ever touching the license file
// or the signing keys. Works in both Cloud (unlimited) and Self-Hosted.

import { createServerFn } from "@tanstack/react-start";
import type { LicenseEntitlements } from "@/lib/providers/interfaces";
import { getLicensingProvider } from "@/lib/providers/registry";

export const getLicenseEntitlements = createServerFn({ method: "GET" }).handler(
  async (): Promise<LicenseEntitlements> => {
    try {
      return await getLicensingProvider().entitlements();
    } catch {
      return {
        unlimited: false,
        installId: null,
        customer: null,
        edition: "community",
        seats: null,
        modules: [],
        expiresAt: null,
        maintenanceExpiresAt: null,
        revoked: false,
      };
    }
  },
);
