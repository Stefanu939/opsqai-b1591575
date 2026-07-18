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
// Profile repository (Wave C.2a.1) — Cloud reads/writes public.profiles;
// Self-Hosted stores the same fields on public.users (single-tenant).
// --------------------------------------------------------------------

export interface ProfileRecord {
  userId: UserId;
  companyId: string;
  /** Populated on Self-Hosted from public.users.email; null on Cloud (email lives on auth.users). */
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  departmentId: string | null;
  isActive: boolean;
  languagePref: string;
  dashboardLayout: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfilePatch {
  companyId?: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  position?: string | null;
  department?: string | null;
  departmentId?: string | null;
  isActive?: boolean;
  languagePref?: string;
  dashboardLayout?: unknown | null;
}

export interface ProfileCreateInput extends ProfilePatch {
  userId: UserId;
  companyId: string;
}

export interface IProfileRepository {
  findByUserId(userId: UserId): Promise<ProfileRecord | null>;
  updateByUserId(userId: UserId, patch: ProfilePatch): Promise<ProfileRecord>;
  listByCompany(companyId: string): Promise<ProfileRecord[]>;
  create(input: ProfileCreateInput): Promise<ProfileRecord>;
  deleteByUserId(userId: UserId): Promise<void>;
}

// --------------------------------------------------------------------
// Role repository (Wave C.2a.1) — wraps user_roles + role_permissions.
// --------------------------------------------------------------------

export type RoleName = string;

export interface RoleAssignment {
  userId: UserId;
  role: RoleName;
}

export interface RoleAssignmentDetailed extends RoleAssignment {
  /** True iff the assignment carries the immutable platform-owner flag. */
  isPlatformOwner: boolean;
  /** Company scope on Cloud (multi-tenant); null on Self-Hosted. */
  companyId: string | null;
}

export interface IRoleRepository {
  listRolesForUser(userId: UserId): Promise<RoleName[]>;
  hasRole(userId: UserId, role: RoleName): Promise<boolean>;
  /**
   * Add a role assignment. `companyId` is honoured on Cloud (multi-tenant
   * user_roles rows carry company_id); Self-Hosted ignores it.
   */
  addRole(userId: UserId, role: RoleName, companyId?: string | null): Promise<void>;
  removeRole(userId: UserId, role: RoleName): Promise<void>;
  removeAllRoles(userId: UserId): Promise<void>;
  /**
   * Remove every non-platform role for `userId`. Platform-scoped roles
   * (`platform_admin`, `platform_owner`) are preserved. Used before
   * replacing a user's operational role.
   */
  removeNonPlatformRoles(userId: UserId): Promise<void>;
  /** True iff the user has the immutable platform-owner flag on any assignment. */
  isPlatformOwner(userId: UserId): Promise<boolean>;
  /**
   * Permission check. Cloud impl calls `has_permission` RPC; Self-Hosted
   * derives from a fixed role→permission map (no role_permissions table
   * exists on Self-Hosted v1).
   */
  hasPermission(userId: UserId, permission: string): Promise<boolean>;
  /** If `userIds` is omitted, returns all assignments. */
  listAssignments(userIds?: UserId[]): Promise<RoleAssignment[]>;
  /** Detailed variant that carries `isPlatformOwner` and `companyId`. */
  listAssignmentsDetailed(userIds?: UserId[]): Promise<RoleAssignmentDetailed[]>;
  listPermissionsForRole(role: RoleName): Promise<string[]>;
}

// --------------------------------------------------------------------
// Company repository (Wave C.2a.1.c) — Cloud reads public.companies;
// Self-Hosted returns a synthetic single-tenant record (OPSQAI_INSTALL_ID).
// --------------------------------------------------------------------

export interface CompanyRecord {
  id: string;
  name: string;
  /** OPSQAI internal system tenant. Cloud: `companies.is_system=TRUE`; Self-Hosted: always TRUE. */
  isSystem: boolean;
  active: boolean;
  createdAt: string;
}

export interface ICompanyRepository {
  findById(id: string): Promise<CompanyRecord | null>;
  /** Returns the OPSQAI internal ("system") company. */
  findSystemCompany(): Promise<CompanyRecord | null>;
  /** Oldest active company — fallback for platform-admin write scoping. */
  findFirstActive(): Promise<CompanyRecord | null>;
  list(): Promise<CompanyRecord[]>;
}

// --------------------------------------------------------------------
// Department repository (Wave C.2a.1.c)
// --------------------------------------------------------------------

export interface DepartmentRecord {
  id: string;
  name: string;
  companyId: string | null;
}

export interface IDepartmentRepository {
  list(companyId?: string): Promise<DepartmentRecord[]>;
  findByNameCI(companyId: string, name: string): Promise<DepartmentRecord | null>;
  create(input: { name: string; companyId: string }): Promise<DepartmentRecord>;
  /**
   * Delete a department scoped to `companyId`. Implementations MUST
   * nullify `department_id` on any profile referencing it before the
   * DELETE, so the FK-less columns stay consistent. Throws if the
   * department does not belong to `companyId`.
   */
  delete(id: string, companyId: string): Promise<void>;
}

// --------------------------------------------------------------------
// Admin-authentication surface (Wave C.2a.1.c)
//
// Privileged user CRUD that used to live on `supabaseAdmin.auth.admin`.
// Cloud: wraps supabase-js Admin API + welcome/invitation email
// dispatch. Self-Hosted: writes directly to public.users through the
// pg pool; sets `must_change_password = TRUE` for temporary passwords.
//
// Email-invitation is Cloud-only for now: `supportsEmailInvite = false`
// on Self-Hosted and `inviteByEmail` throws. The full self-hosted
// invitation flow (token, email template, acceptance route) is a
// future feature; administrators create Self-Hosted users with a
// temporary password today.
// --------------------------------------------------------------------

export interface AdminUserRecord {
  id: UserId;
  email: string;
  lastSignInAt: string | null;
  createdAt: string;
}

export interface AdminCreateUserInput {
  email: string;
  password: string;
  /** Force password change on first sign-in (temp-password flow). */
  mustChangePassword?: boolean;
  /** Cloud: skips confirmation email; Self-Hosted: ignored. */
  emailConfirm?: boolean;
  /** Cloud: written to auth.users.user_metadata; Self-Hosted: ignored. */
  metadata?: Record<string, unknown>;
  /** Optional welcome email. Cloud dispatches; Self-Hosted is a no-op. */
  welcomeEmail?: {
    firstName?: string;
    workspaceName?: string | null;
  };
}

export interface AdminInviteUserInput {
  email: string;
  /** Absolute URL the invitation email links back to. */
  redirectTo: string;
  metadata?: Record<string, unknown>;
  emailData?: {
    inviterName?: string;
    workspaceName?: string | null;
    role?: string;
  };
}

export interface IAuthAdminProvider extends Provider {
  /** Whether email-based invitations are supported on this platform. */
  readonly supportsEmailInvite: boolean;
  createUser(input: AdminCreateUserInput): Promise<{ id: UserId }>;
  /** Throws with a clear message when `supportsEmailInvite` is false. */
  inviteByEmail(input: AdminInviteUserInput): Promise<{ id: UserId }>;
  deleteUser(userId: UserId): Promise<void>;
  updatePassword(
    userId: UserId,
    newPassword: string,
    opts?: { mustChangePassword?: boolean },
  ): Promise<void>;
  setDisabled(userId: UserId, disabled: boolean): Promise<void>;
  listUsers(): Promise<AdminUserRecord[]>;
  findUserAuthMeta(userId: UserId): Promise<AdminUserRecord | null>;
}

/**
 * Per-request factories. Cloud implementations receive a user-scoped
 * `SupabaseClient<Database>` from `requireAuth`'s data context; the
 * admin variant receives the service-role client. Self-Hosted
 * implementations ignore the `dataCtx` argument and bind to the pg pool
 * captured at bootstrap.
 */
export type ProfileRepositoryFactory = (dataCtx: unknown) => IProfileRepository;
export type RoleRepositoryFactory = (dataCtx: unknown) => IRoleRepository;
export type CompanyRepositoryFactory = (dataCtx: unknown) => ICompanyRepository;
export type DepartmentRepositoryFactory = (dataCtx: unknown) => IDepartmentRepository;

// --------------------------------------------------------------------
// Wave C.2b.1 — chat / feedback / integration repositories.
// Every write is user-scoped through `dataCtx` (Cloud: user-scoped
// SupabaseClient enforcing RLS; Self-Hosted: shared pg pool where the
// caller's identity is enforced in the repository by explicit filters).
// --------------------------------------------------------------------

export interface ThreadRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
  userId: string;
}

export interface IThreadRepository {
  create(input: { userId: string; companyId: string; title: string }): Promise<
    Pick<ThreadRecord, "id" | "title" | "createdAt" | "updatedAt">
  >;
  deleteOwned(id: string, userId: string): Promise<void>;
  listForUser(
    userId: string,
    opts?: { companyId?: string | null; limit?: number },
  ): Promise<
    Array<Pick<ThreadRecord, "id" | "title" | "createdAt" | "updatedAt" | "companyId">>
  >;
  renameOwned(id: string, userId: string, title: string): Promise<void>;
}

export interface AssistantMessage {
  id: string;
  threadId: string;
  confidence: number | null;
  createdAt: string;
}

export interface PreviousUserMessage {
  id: string;
  content: string;
}

export interface IMessageRepository {
  findAssistantById(id: string): Promise<AssistantMessage | null>;
  findLastUserBefore(
    threadId: string,
    beforeCreatedAt: string,
  ): Promise<PreviousUserMessage | null>;
}

export interface FeedbackUpsertInput {
  messageId: string;
  userId: string;
  companyId: string;
  rating: 1 | -1;
  comment: string | null;
}

export interface IFeedbackRepository {
  upsertRating(input: FeedbackUpsertInput): Promise<void>;
}

export interface KnowledgeGapCreateInput {
  companyId: string;
  questionNormalized: string;
  questionSample: string;
  departmentId: string | null;
  createdBy: string;
  confidence: number | null;
  sourceThreadId: string;
  sourceMessageId: string;
}

export interface IKnowledgeGapRepository {
  /**
   * Semantic-or-text match. Cloud: `match_knowledge_gap` RPC (pgvector).
   * Self-Hosted: exact match on `question_normalized` scoped to the company.
   */
  matchExisting(companyId: string, questionNormalized: string): Promise<string | null>;
  incrementOccurrence(id: string): Promise<void>;
  create(input: KnowledgeGapCreateInput): Promise<{ id: string }>;
}

export interface IntegrationRecord {
  companyId: string;
  provider: string;
  status: string;
  config: Record<string, unknown>;
  connectedAt: string | null;
  lastError: string | null;
}

export interface IIntegrationRepository {
  find(companyId: string, provider: string): Promise<IntegrationRecord | null>;
  upsert(input: {
    companyId: string;
    provider: string;
    status: string;
    config: Record<string, unknown>;
    connectedAt: string;
    connectedBy: string;
  }): Promise<void>;
  update(
    companyId: string,
    provider: string,
    patch: Partial<Pick<IntegrationRecord, "status" | "config" | "lastError">>,
  ): Promise<void>;
}

export type ThreadRepositoryFactory = (dataCtx: unknown) => IThreadRepository;
export type MessageRepositoryFactory = (dataCtx: unknown) => IMessageRepository;
export type FeedbackRepositoryFactory = (dataCtx: unknown) => IFeedbackRepository;
export type KnowledgeGapRepositoryFactory = (dataCtx: unknown) => IKnowledgeGapRepository;
export type IntegrationRepositoryFactory = (dataCtx: unknown) => IIntegrationRepository;

// --------------------------------------------------------------------
// FAQs
// --------------------------------------------------------------------

export interface FaqRow {
  id: string;
  company_id: string | null;
  question_de: string;
  question_en: string;
  answer_de: string;
  answer_en: string;
  category: string;
}

export interface FaqUpsertInput {
  question_de: string;
  question_en: string;
  answer_de: string;
  answer_en: string;
  category: string;
}

export interface IFaqRepository {
  update(id: string, patch: FaqUpsertInput): Promise<void>;
  getMetaById(id: string): Promise<Pick<FaqRow, "company_id" | "category" | "question_en"> | null>;
  insert(companyId: string, input: FaqUpsertInput): Promise<Pick<FaqRow, "id" | "category" | "question_en">>;
  delete(id: string): Promise<void>;
}

export type FaqRepositoryFactory = (dataCtx: unknown) => IFaqRepository;







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
