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
  /**
   * Wave C bridge: return an opaque per-request data-access handle for
   * server functions running under `requireAuth`. On Cloud this is a
   * user-scoped Supabase client (`SupabaseClient<Database>`). On
   * Self-Hosted this is a throwing proxy — every un-migrated
   * `context.supabase.from(...)` call throws until the owning feature
   * is moved to a proper repository in Wave C.2. Type is `unknown` so
   * `interfaces.ts` stays free of Supabase imports; the `requireAuth`
   * middleware casts to `SupabaseClient<Database>` for consumer types.
   */
  getDataContext(token: string): Promise<unknown>;
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

// --------------------------------------------------------------------
// Browser-side authentication surface (Capability.Authentication)
// --------------------------------------------------------------------
//
// `IAuthProvider` above is the server-side surface (token minting/
// verification, password reset persistence). `IBrowserAuthProvider` is
// what UI code sees: current session, sign in/out, session-change
// notifications. Provider-agnostic — Cloud maps Supabase session/user
// types to these shapes; Self-Hosted derives them from local JWT claims.
// Feature code must never import Supabase types directly.

/** Roles carried in the current session's claims. */
export type OpsqaiRole = string;

export interface OpsqaiUser {
  id: UserId;
  email: string | null;
  /** Provider-specific display name; may be null on Self-Hosted first login. */
  displayName?: string | null;
  /**
   * Free-form profile metadata (avatar, full_name, locale). Shape is
   * provider-defined; consumers must not assume required fields.
   */
  metadata?: Record<string, unknown>;
}

export interface OpsqaiClaims {
  /** Subject — same as user id. */
  sub: UserId;
  email: string | null;
  roles: OpsqaiRole[];
  /** Epoch seconds. */
  exp?: number;
  /** Session id, if the provider tracks one. */
  sid?: string;
  /** Additional provider-specific claims. Consumers should not depend on shape. */
  [key: string]: unknown;
}

export interface OpsqaiSession {
  user: OpsqaiUser;
  /** Bearer token for authenticated requests to the app's server functions. */
  accessToken: string;
  /** Epoch seconds when accessToken expires. */
  expiresAt: number;
  /** Opaque refresh handle. Never surfaced outside the provider. */
  refreshToken?: string;
}

export type SessionChangeEvent =
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED"
  | "INITIAL_SESSION"
  | "PASSWORD_RECOVERY";

export interface SessionChangeListener {
  (event: SessionChangeEvent, session: OpsqaiSession | null): void;
}

export interface Unsubscribe {
  (): void;
}

export interface RequestPasswordResetOptions {
  /** Absolute URL the reset email should link back to. */
  redirectTo?: string;
}

export interface SignInWithOAuthOptions {
  /** Absolute URL the provider redirects to after consent. */
  redirectTo?: string;
}

export interface SignInWithSSOOptions {
  /** Absolute URL the IdP redirects to after login. */
  redirectTo?: string;
}

export interface SetSessionFromUrlResult {
  session: OpsqaiSession | null;
  /**
   * `password_recovery` means the URL was a password-reset link; the
   * app should render the update-password form instead of navigating.
   */
  kind: "sign_in" | "password_recovery" | "invite" | "unknown";
}

/**
 * Browser-side auth surface. Wraps the concrete auth SDK so feature code
 * never imports it. Bootstrap picks Cloud (Supabase-backed) or
 * Self-Hosted (local JWT) implementation at app startup.
 */
export interface IBrowserAuthProvider {
  readonly capability: Capability;
  readonly name: string;

  /** Current session, or null if signed out. */
  getSession(): Promise<OpsqaiSession | null>;
  /** Current user (revalidated against the auth server). */
  getUser(): Promise<OpsqaiUser | null>;
  /** Claims for the current access token (roles, sub, etc.). */
  getClaims(): Promise<OpsqaiClaims | null>;

  /** Subscribe to session-change events. Returns an unsubscribe function. */
  onSessionChange(listener: SessionChangeListener): Unsubscribe;

  signInWithPassword(input: { email: string; password: string }): Promise<OpsqaiSession>;
  /** SSO via configured SAML/OIDC provider id. */
  signInWithSSO(
    input: { providerId: string } & SignInWithSSOOptions,
  ): Promise<{ url?: string }>;
  /** OAuth via Google/Apple/etc. Cloud routes via Lovable broker. */
  signInWithOAuth(
    provider: "google" | "apple",
    options?: SignInWithOAuthOptions,
  ): Promise<void>;

  signOut(): Promise<void>;

  requestPasswordReset(email: string, options?: RequestPasswordResetOptions): Promise<void>;
  /** Update the current signed-in user's password. */
  updatePassword(newPassword: string): Promise<void>;

  /**
   * Parse an auth URL hash/fragment (from a magic link, invite, or
   * password-reset email) and set the session. Called by the public
   * accept-invite and reset-password routes when they load.
   */
  setSessionFromUrl(): Promise<SetSessionFromUrlResult>;
}
