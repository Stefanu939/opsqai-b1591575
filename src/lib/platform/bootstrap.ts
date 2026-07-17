// Platform bootstrap.
//
// The single site where providers are bound and capabilities registered.
// Called once during server-side startup. Cloud and Self-Hosted call
// this with different provider modules; the rest of the codebase never
// branches on `PlatformMode`.

import {
  Capability,
  PlatformMode,
  getPlatformMode,
  registerCapabilities,
} from "@/lib/platform";
import {
  registerAuthProvider,
  registerBackupService,
  registerLicensingProvider,
  registerNotificationProvider,
  registerSecretsCipher,
  registerStorageProvider,
  registerTelemetrySink,
  registerUserRepository,
} from "@/lib/providers";
import type {
  IAuthProvider,
  IBackupService,
  ILicensingProvider,
  INotificationProvider,
  ISecretsCipher,
  IStorageProvider,
  ITelemetrySink,
  IUserRepository,
} from "@/lib/providers";

export interface PlatformBootstrap {
  auth: IAuthProvider;
  users: IUserRepository;
  storage: IStorageProvider;
  notifications: INotificationProvider;
  licensing: ILicensingProvider;
  cipher: ISecretsCipher;
  backup: IBackupService;
  telemetry: ITelemetrySink;
  capabilities: readonly Capability[];
}

/**
 * Wire every provider and capability. Idempotent — the last call wins,
 * which is what we want for hot module reload in development.
 */
export function bootstrapPlatform(b: PlatformBootstrap): void {
  registerAuthProvider(b.auth);
  registerUserRepository(b.users);
  registerStorageProvider(b.storage);
  registerNotificationProvider(b.notifications);
  registerLicensingProvider(b.licensing);
  registerSecretsCipher(b.cipher);
  registerBackupService(b.backup);
  registerTelemetrySink(b.telemetry);
  registerCapabilities(b.capabilities);

  if (typeof console !== "undefined" && console.info) {
    console.info(
      `[opsqai] platform bootstrapped: mode=${getPlatformMode()} ` +
        `capabilities=[${b.capabilities.join(", ")}]`,
    );
  }
}

/**
 * Default capability set for each platform mode. Provider bundles use
 * this as a starting point and add / remove capabilities based on the
 * customer's configuration (e.g. SMTP only if configured).
 */
export function defaultCapabilitiesFor(mode: PlatformMode): Capability[] {
  if (mode === PlatformMode.Cloud) {
    return [
      Capability.Authentication,
      Capability.Storage,
      Capability.SMTP,
      Capability.AI,
      Capability.Licensing,
      Capability.Telemetry,
      Capability.SSO,
    ];
  }
  // SelfHosted defaults — SSO comes in v1.1, AI/SMTP only if configured.
  return [
    Capability.Authentication,
    Capability.Storage,
    Capability.Licensing,
    Capability.Updates,
    Capability.OfflineMode,
  ];
}
