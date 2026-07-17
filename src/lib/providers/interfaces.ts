// Provider interfaces.
//
// These interfaces are the contract between OPSQAI's shared business
// logic and its infrastructure. Cloud and Self-Hosted supply different
// implementations; call sites never branch on `PlatformMode`.
//
// Do NOT import from `@/integrations/supabase/*` in this file — it must
// stay implementation-agnostic.

import type { Capability } from "@/lib/platform";

// --------------------------------------------------------------------
// Common
// --------------------------------------------------------------------

/** Every provider advertises which capability it satisfies. */
export interface Provider {
  readonly capability: Capability;
  readonly name: string;
}

export type UserId = string;

export interface AuthenticatedContext {
  userId: UserId;
  email: string | null;
  claims: Record<string, unknown>;
}

// --------------------------------------------------------------------
// Authentication (Capability.Authentication)
// --------------------------------------------------------------------

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignInResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch seconds
  user: AuthenticatedContext;
}

export interface IAuthProvider extends Provider {
  signIn(input: SignInInput): Promise<SignInResult>;
  signOut(refreshToken: string): Promise<void>;
  refresh(refreshToken: string): Promise<SignInResult>;
  requestPasswordReset(email: string): Promise<void>;
  confirmPasswordReset(token: string, newPassword: string): Promise<void>;
  verifyAccessToken(token: string): Promise<AuthenticatedContext>;
}

// --------------------------------------------------------------------
// User repository (persistence for identity + roles)
// --------------------------------------------------------------------

export interface UserRecord {
  id: UserId;
  email: string;
  displayName: string | null;
  createdAt: string;
  disabled: boolean;
}

export interface IUserRepository {
  findById(id: UserId): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  createFirstAdmin(input: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<UserRecord>;
  disable(id: UserId): Promise<void>;
}

// --------------------------------------------------------------------
// Storage (Capability.Storage)
// --------------------------------------------------------------------

export interface StoragePutInput {
  bucket: string;
  key: string;
  body: Uint8Array | ReadableStream<Uint8Array>;
  contentType?: string;
}

export interface StorageObject {
  bucket: string;
  key: string;
  size: number;
  contentType: string | null;
  updatedAt: string;
}

export interface IStorageProvider extends Provider {
  put(input: StoragePutInput): Promise<StorageObject>;
  get(bucket: string, key: string): Promise<Uint8Array>;
  delete(bucket: string, key: string): Promise<void>;
  head(bucket: string, key: string): Promise<StorageObject | null>;
  /** Probe used by the health check and installer Test Connection. */
  probe(): Promise<{ ok: boolean; detail?: string }>;
}

// --------------------------------------------------------------------
// Notifications / SMTP (Capability.SMTP)
// --------------------------------------------------------------------

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface INotificationProvider extends Provider {
  sendEmail(message: EmailMessage): Promise<void>;
  /** Used by installer's Send Test Email button. */
  sendTestEmail(to: string): Promise<void>;
}

// --------------------------------------------------------------------
// Licensing (Capability.Licensing)
// --------------------------------------------------------------------

export type LicenseChannel = "stable" | "beta" | "internal";

export interface LicenseDetails {
  customer: string;
  seats: number;
  expiresAt: string; // ISO
  supportLevel: string;
  channel: LicenseChannel;
  edition: string; // Edition enum value
  featureFlags: Record<string, boolean>;
}

export interface HeartbeatInput {
  installationId: string;
  machineFingerprintSha256: string;
  appVersion: string;
}

export interface ILicensingProvider extends Provider {
  validate(): Promise<LicenseDetails>;
  heartbeat(input: HeartbeatInput): Promise<{ ok: boolean; nextAt?: string }>;
  /** Available update manifest (Self-Hosted only; Cloud returns null). */
  latestRelease(input: HeartbeatInput): Promise<{ version: string; url: string } | null>;
}

// --------------------------------------------------------------------
// Secrets cipher (Capability-independent; wraps sensitive columns)
// --------------------------------------------------------------------

export interface ISecretsCipher {
  encrypt(plaintext: Uint8Array): Promise<Uint8Array>;
  decrypt(ciphertext: Uint8Array): Promise<Uint8Array>;
  /** Decrypts the canary blob written at install; used by health check. */
  verifyCanary(): Promise<boolean>;
}

// --------------------------------------------------------------------
// Backup (Capability-adjacent; used by the updater on Self-Hosted)
// --------------------------------------------------------------------

export interface BackupSnapshot {
  id: string;
  createdAt: string;
  path: string;
  sizeBytes: number;
  /** Hex SHA-256 of the archive at snapshot time. */
  sha256?: string;
  /** Free-form label — e.g. `pre-update-1.2.3`, `scheduled-daily`. */
  tag?: string;
  /** `manual` | `scheduled` | `pre-update`. */
  kind?: string;
  /** Last time the archive was re-hashed and matched sha256. */
  verifiedAt?: string;
}

export interface SnapshotOptions {
  tag?: string;
  kind?: "manual" | "scheduled" | "pre-update";
}

export interface IBackupService {
  snapshot(options?: SnapshotOptions): Promise<BackupSnapshot>;
  restore(id: string): Promise<void>;
  list(): Promise<BackupSnapshot[]>;
  prune(retainDays: number): Promise<number>;
  /** Recompute sha256 for a stored snapshot; updates verified_at on match. */
  verifyIntegrity(id: string): Promise<boolean>;
}

// --------------------------------------------------------------------
// Telemetry (Capability.Telemetry)
// --------------------------------------------------------------------

export type TelemetryLevel = "disabled" | "anonymous" | "full";

export interface ITelemetrySink extends Provider {
  readonly level: TelemetryLevel;
  event(name: string, payload?: Record<string, unknown>): Promise<void>;
}
