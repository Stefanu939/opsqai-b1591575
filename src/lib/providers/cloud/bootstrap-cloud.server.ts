// Cloud bootstrap.
//
// Wires OPSQAI Cloud providers into the shared registry. Called from
// the TanStack Start server entry on the opsqai.de deployment. Never
// imported by Self-Hosted code paths.

import {
  Capability,
  Edition,
  PlatformMode,
  bootstrapPlatform,
  defaultCapabilitiesFor,
  setActiveEdition,
} from "@/lib/platform";
import {
  NoopBackupService,
  NoopTelemetrySink,
  NullCipher,
} from "@/lib/providers/null-providers";
import type {
  IAuthProvider,
  ILicensingProvider,
  INotificationProvider,
  IUserRepository,
} from "@/lib/providers/interfaces";

import { createSupabaseAuthProvider } from "./supabase-auth.server";
import { createSupabaseStorageProvider } from "./supabase-storage.server";

// Placeholder cloud providers for capabilities where MC does not yet
// have a dedicated adapter — MC's existing feature code continues to
// call Supabase directly through their existing modules. These stubs
// exist so `getRegisteredX()` never returns null in production.

class CloudUserRepository implements IUserRepository {
  async findById(): Promise<null> {
    throw new Error("cloud user repo: use Supabase client directly (MC-managed)");
  }
  async findByEmail(): Promise<null> {
    throw new Error("cloud user repo: use Supabase client directly (MC-managed)");
  }
  async createFirstAdmin(): Promise<never> {
    throw new Error("cloud user repo: first-run install is Self-Hosted-only");
  }
  async disable(): Promise<void> {
    throw new Error("cloud user repo: use Supabase admin client (MC-managed)");
  }
}

class CloudNotificationProvider implements INotificationProvider {
  readonly capability = Capability.SMTP;
  readonly name = "opsqai.cloud.notifications";
  async sendEmail(): Promise<void> {
    throw new Error("cloud notifications: routed through MC email service");
  }
  async sendTestEmail(): Promise<void> {
    throw new Error("cloud notifications: routed through MC email service");
  }
}

class CloudLicensingProvider implements ILicensingProvider {
  readonly capability = Capability.Licensing;
  readonly name = "opsqai.cloud.licensing";
  async validate() {
    // Cloud tenants are licensed per-workspace; the seat/plan lookup
    // happens in MC's existing subscription code.
    return {
      customer: "cloud-tenant",
      seats: Number.POSITIVE_INFINITY,
      expiresAt: "2999-12-31T00:00:00Z",
      supportLevel: "cloud",
      channel: "stable" as const,
      edition: Edition.Enterprise,
      featureFlags: {},
    };
  }
  async heartbeat() {
    return { ok: true };
  }
  async latestRelease() {
    return null;
  }
}

/** Wire every Cloud provider. Idempotent. */
export function bootstrapCloud(): void {
  setActiveEdition(Edition.Enterprise);

  const auth: IAuthProvider = createSupabaseAuthProvider();

  bootstrapPlatform({
    auth,
    users: new CloudUserRepository(),
    storage: createSupabaseStorageProvider(),
    notifications: new CloudNotificationProvider(),
    licensing: new CloudLicensingProvider(),
    cipher: new NullCipher(),
    backup: new NoopBackupService(),
    telemetry: new NoopTelemetrySink(),
    capabilities: defaultCapabilitiesFor(PlatformMode.Cloud),
  });
}
