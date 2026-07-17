// Self-Hosted provider bundle barrel.
export {
  signJwtEd25519,
  verifyJwtEd25519,
} from "./jwt-ed25519.server";
export type {
  JwtClaims,
  JwtHeader,
  VerifyOptions,
  Ed25519KeyPairPem,
} from "./jwt-ed25519.server";
export { createPgUserRepository } from "./pg-user-repository.server";
export { createLocalAuthProvider } from "./local-auth.server";
export type { LocalAuthDeps } from "./local-auth.server";
export { createNtfsStorageProvider } from "./ntfs-storage.server";
export {
  createAesGcmCipher,
  createDpapiCipher,
  mintCanary,
} from "./dpapi-cipher.server";
export { createSmtpNotificationProvider } from "./smtp-notification.server";
export { createLocalLicensingProvider } from "./local-licensing.server";
export { createWindowsBackupService } from "./windows-backup.server";
export { createLocalTelemetrySink } from "./local-telemetry.server";
export { bootstrapSelfHosted } from "./bootstrap-selfhost.server";
