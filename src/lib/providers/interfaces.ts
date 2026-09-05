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
  /**
   * Optional caller IP. Self-Hosted uses it as a second throttling bucket so a
   * single host cannot spray guesses across many accounts.
   */
  ip?: string | null;
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

export interface PermissionRecord {
  key: string;
  label: string;
  category: string;
  description: string | null;
}

export interface RoleRecord {
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isProtected: boolean;
  permissions: string[];
}

export interface IRbacAdminRepository {
  listPermissions(): Promise<PermissionRecord[]>;
  listRoles(): Promise<RoleRecord[]>;
  createRole(input: { key: string; name: string; description?: string | null; permissions: string[] }): Promise<void>;
  updateRole(key: string, input: { name: string; description?: string | null; permissions: string[] }): Promise<void>;
  deleteRole(key: string): Promise<void>;
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
  /** True once the address has been confirmed (Cloud email link / Self-Hosted has no verification step and is always true). */
  emailConfirmed: boolean;
  /** True when the account is currently disabled/banned. */
  disabled: boolean;
  /** True when the account has never signed in yet (invited/created but pending first sign-in). */
  invited: boolean;
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
  /** Change a user's sign-in email address. */
  updateEmail(userId: UserId, newEmail: string): Promise<void>;
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

export type JsonLike =
  | string
  | number
  | boolean
  | null
  | JsonLike[]
  | { [key: string]: JsonLike };

export interface ThreadMessageRecord {
  id: string;
  role: string;
  content: string;
  parts: JsonLike;
  sources: JsonLike;
  created_at: string;
}

export interface IMessageRepository {
  /** Ordered transcript for one thread, oldest first. */
  listByThread(threadId: string): Promise<ThreadMessageRecord[]>;
  findAssistantById(id: string): Promise<AssistantMessage | null>;
  findLastUserBefore(
    threadId: string,
    beforeCreatedAt: string,
  ): Promise<PreviousUserMessage | null>;
  insertMany(input: Array<{
    threadId: string;
    userId: string;
    companyId: string;
    role: string;
    content: string;
    parts: JsonLike;
    sources: JsonLike | null;
    confidence: number | null;
  }>): Promise<Array<{ id: string; role: string }>>;
}

export interface DirectContactRecord {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  isStaff: boolean;
  isColleague: boolean;
}

export interface DirectMessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  attachments: JsonLike[];
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

export interface DirectConversationRecord {
  id: string;
  createdAt: string;
  lastMessageAt: string;
  peer: DirectContactRecord | null;
  lastMessage: { body: string | null; createdAt: string; senderId: string; hasAttachments: boolean } | null;
  unreadCount: number;
}

export interface IDirectMessageRepository {
  searchContacts(userId: string, query: string, limit: number): Promise<DirectContactRecord[]>;
  listConversations(userId: string): Promise<DirectConversationRecord[]>;
  findOrCreate(userId: string, targetUserId: string): Promise<string>;
  listMessages(userId: string, conversationId: string, before: string | null, limit: number): Promise<DirectMessageRecord[]>;
  send(userId: string, input: { conversationId: string; body: string | null; attachments: JsonLike[] }): Promise<DirectMessageRecord>;
  markRead(userId: string, conversationId: string): Promise<void>;
}

export interface AiAuditRecord {
  id: string;
  score: number;
  maturity: string | null;
  passed: number;
  warnings: number;
  critical: number;
  summary: JsonLike;
  createdAt: string;
}

export interface IAiAuditRepository {
  list(companyId: string, limit: number): Promise<AiAuditRecord[]>;
  create(input: Omit<AiAuditRecord, "id" | "createdAt"> & {
    companyId: string;
    requestedBy: string;
    model?: string | null;
    latencyMs?: number | null;
    inputHash?: string | null;
    outputHash?: string | null;
    tokenUsage?: JsonLike | null;
    retrievalChunkIds?: string[];
    status?: string;
    errorCode?: string | null;
  }): Promise<{ id: string }>;

  /**
   * Recurring open questions (knowledge gaps) used by the audit
   * recommendation engine to propose missing SOPs / FAQs.
   */
  gapClusters(companyId: string, limit: number): Promise<AuditGapClusterRow[]>;

  /**
   * Per-user learning friction signals: how often / how fast someone had to
   * ask the assistant while an enrollment was in progress, plus quiz results.
   */
  learnerSignals(companyId: string, limit: number): Promise<AuditLearnerSignalRow[]>;

  /** Structural knowledge-base counters (documents, FAQ, courses). */
  knowledgeSignal(companyId: string): Promise<AuditKnowledgeSignalRow>;
}

export interface AuditGapClusterRow {
  id?: string | null;
  question: string;
  occurrences: number;
  status: string;
  departmentName: string | null;
  lastSeen: string;
  confidence: number | null;
}

export interface AuditLearnerSignalRow {
  userId: string;
  name: string;
  department: string | null;
  questionsWhileLearning: number;
  learningSeconds: number;
  lowConfidenceQuestions: number;
  avgConfidence: number;
  activeEnrollments: number;
  overdueEnrollments: number;
  completedEnrollments: number;
  avgQuizScore: number | null;
  failedQuizAttempts: number;
}

export interface AuditKnowledgeSignalRow {
  documents: number;
  readyDocuments: number;
  staleDocuments: number;
  faqs: number;
  courses: number;
  categories: Record<string, number>;
  /** Active documents past their review cadence (0021_knowledge_lifecycle). */
  outdatedDocuments?: number;
  /** Active documents due for review within 30 days. */
  reviewDueSoonDocuments?: number;
  /** Median information age in days across active documents. */
  medianDocumentAgeDays?: number | null;
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
  /** Null when the gap is recorded automatically before the answer is persisted. */
  sourceThreadId: string | null;
  sourceMessageId: string | null;

}

export interface ComplianceSettingsRecord {
  companyId: string;
  countryCode: string;
  primaryLanguage: string;
  frameworkKeys: string[];
  reviewIntervalDays: Record<string, number>;
  updatedBy: string | null;
  updatedAt: string;
}

export interface ComplianceSettingsPatch {
  countryCode?: string;
  primaryLanguage?: string;
  frameworkKeys?: string[];
  reviewIntervalDays?: Record<string, number>;
}

export interface IComplianceRepository {
  get(companyId: string): Promise<ComplianceSettingsRecord | null>;
  upsert(
    companyId: string,
    patch: ComplianceSettingsPatch,
    actorId: string | null,
  ): Promise<ComplianceSettingsRecord>;
}

export interface IKnowledgeGapRepository {
  /**
   * Semantic-or-text match. Cloud: `match_knowledge_gap` RPC (pgvector).
   * Self-Hosted: exact match on `question_normalized` scoped to the company.
   */
  matchExisting(companyId: string, questionNormalized: string): Promise<string | null>;
  incrementOccurrence(id: string): Promise<void>;
  create(input: KnowledgeGapCreateInput): Promise<{ id: string }>;

  /**
   * Company-scoped gap list, already enriched with the display names the
   * Knowledge Gaps page renders (department, reporter, resolved SOP/FAQ).
   */
  list(companyId: string, limit: number): Promise<KnowledgeGapListRow[]>;
  update(companyId: string, id: string, patch: KnowledgeGapPatch): Promise<void>;
  remove(companyId: string, id: string): Promise<void>;
}

export interface KnowledgeGapListRow {
  id: string;
  question_sample: string;
  question_normalized: string;
  occurrences: number;
  first_seen: string;
  last_seen: string;
  status: string;
  assignee_id: string | null;
  resolution: string | null;
  resolved_document_id: string | null;
  resolved_faq_id: string | null;
  department_id: string | null;
  created_by: string | null;
  confidence: number | null;
  source_thread_id: string | null;
  source_message_id: string | null;
  resolution_date: string | null;
  updated_at: string;
  department_name: string | null;
  created_by_name: string | null;
  resolved_document: { id: string; title: string; doc_code: string | null } | null;
  resolved_faq: { id: string; question_en: string | null } | null;
}

export interface KnowledgeGapPatch {
  status?: "open" | "in_progress" | "resolved" | "ignored";
  assignee_id?: string | null;
  resolution?: "sop" | "faq" | "dismissed" | null;
  resolved_document_id?: string | null;
  resolved_faq_id?: string | null;
  resolution_date?: string | null;
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
export type ComplianceRepositoryFactory = (dataCtx: unknown) => IComplianceRepository;

// --------------------------------------------------------------------
// Module access repository — per-user module grants (SuperAdmin model).
// Backs `public.user_module_access`. A user with no rows for a given
// (company, user) falls back to the role preset in `src/lib/module-access.ts`.
// --------------------------------------------------------------------

export interface ModuleAccessRecord {
  userId: string;
  companyId: string;
  moduleKey: string;
  grantedBy: string | null;
  createdAt: string;
}

export interface IModuleAccessRepository {
  listForUser(companyId: string, userId: string): Promise<ModuleAccessRecord[]>;
  listForCompany(companyId: string): Promise<ModuleAccessRecord[]>;
  /** Replaces the full explicit grant set for one user with `moduleKeys`. */
  replaceForUser(
    companyId: string,
    userId: string,
    moduleKeys: string[],
    grantedBy: string | null,
  ): Promise<void>;
}

export type ModuleAccessRepositoryFactory = (dataCtx: unknown) => IModuleAccessRepository;
export type FeedbackRepositoryFactory = (dataCtx: unknown) => IFeedbackRepository;
export type KnowledgeGapRepositoryFactory = (dataCtx: unknown) => IKnowledgeGapRepository;
export type IntegrationRepositoryFactory = (dataCtx: unknown) => IIntegrationRepository;
export type RbacAdminRepositoryFactory = (dataCtx: unknown) => IRbacAdminRepository;
export type DirectMessageRepositoryFactory = (dataCtx: unknown) => IDirectMessageRepository;
export type AiAuditRepositoryFactory = (dataCtx: unknown) => IAiAuditRepository;
export type DashboardRepositoryFactory = (dataCtx: unknown) => IDashboardRepository;

// --------------------------------------------------------------------
// Dashboard read models
//
// Cloud delegates to the `dashboard_*` SQL functions; Self-Hosted computes
// the same shapes from the local PostgreSQL schema. The returned shapes are
// the contract the dashboard UI renders, so both must stay identical.
// --------------------------------------------------------------------

export interface DashboardKpis {
  questionsAnswered: number;
  questions30d: number;
  questionsToday: number;
  avgConfidence: number;
  openGaps: number;
  criticalSops: number;
  documents: number;
  faqs: number;
  aiAudits: number;
  auditEvents: number;
  activeUsers: number;
}

export interface DashboardHealth {
  score: number;
  label: string;
  breakdown: Record<string, number>;
}

export interface DashboardKnowledgeStatus {
  complete: number;
  inProgress: number;
  missing: number;
}

export interface DashboardTopSop {
  code: string | null;
  title: string | null;
  usage: number;
  updatedAt: string | null;
}

export interface DashboardCriticalSop {
  id: string;
  title: string;
  code: string | null;
  version: number;
  updatedAt: string | null;
  reason: string;
}

export interface DashboardActivityRow {
  bucket: string;
  questions: number;
  conversations: number;
  users: number;
  aiResponses: number;
}

export interface IDashboardRepository {
  kpis(companyId: string): Promise<DashboardKpis>;
  health(companyId: string): Promise<DashboardHealth>;
  knowledgeStatus(companyId: string): Promise<DashboardKnowledgeStatus>;
  topSops(companyId: string, limit: number): Promise<DashboardTopSop[]>;
  criticalSops(companyId: string): Promise<DashboardCriticalSop[]>;
  lastAiAudit(companyId: string): Promise<AiAuditRecord | null>;
  activity(
    companyId: string,
    from: string,
    to: string,
    bucket: "hour" | "day" | "week",
  ): Promise<DashboardActivityRow[]>;
  getLayout(userId: string): Promise<unknown | null>;
  saveLayout(userId: string, layout: unknown): Promise<void>;
}

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
  /**
   * Ordered FAQ list. `companyId === null` means "all workspaces" and is only
   * reachable for platform admins in Global mode (Cloud); Self-Hosted is
   * single-tenant so the filter is a no-op there.
   */
  list(companyId: string | null): Promise<FaqRow[]>;
  update(id: string, patch: FaqUpsertInput): Promise<void>;
  getMetaById(id: string): Promise<Pick<FaqRow, "company_id" | "category" | "question_en"> | null>;
  insert(companyId: string, input: FaqUpsertInput): Promise<Pick<FaqRow, "id" | "category" | "question_en">>;
  delete(id: string): Promise<void>;
}

export type FaqRepositoryFactory = (dataCtx: unknown) => IFaqRepository;

// --------------------------------------------------------------------
// Knowledge Base (documents + chunks + vector search)
// --------------------------------------------------------------------

export interface KnowledgeDocumentInsert {
  company_id: string;
  title: string;
  category: string;
  doc_code?: string | null;
  file_path: string;
  file_type: string;
  uploaded_by?: string | null;
}

export interface KnowledgeDocumentRow {
  id: string;
  company_id: string;
  title: string;
  category: string;
  doc_code: string | null;
  file_path: string | null;
  file_type: string | null;
  status: string;
  chunk_count: number;
  /** Lifecycle metadata (0021_knowledge_lifecycle). Nullable on legacy rows. */
  information_updated_at?: string | null;
  last_reviewed_at?: string | null;
  review_interval_days?: number | null;
  owner_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  version?: number;
  is_critical?: boolean;
  department_id?: string | null;
}

/** Editable lifecycle/ownership metadata for a knowledge document. */
export interface KnowledgeMetadataPatch {
  title?: string;
  category?: string;
  doc_code?: string | null;
  department_id?: string | null;
  owner_id?: string | null;
  information_updated_at?: string | null;
  last_reviewed_at?: string | null;
  review_interval_days?: number | null;
}

export interface KnowledgeChunkInsert {
  document_id: string;
  company_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  /** Embedding vector at the install's pinned dimension; repository formats it as pgvector text. */
  embedding: number[];
}

export interface KnowledgeMatch {
  document_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
}

export interface KnowledgeChunkContentRow {
  document_id: string;
  chunk_index: number;
  content: string;
}

/** Lineage anchor used by SOP version replace / rollback. */
export interface KnowledgeVersionAnchor {
  id: string;
  company_id: string;
  doc_code: string | null;
  version: number;
  parent_document_id: string | null;
}

/** New revision of an existing document (SOP version replace). */
export interface KnowledgeVersionInsert extends KnowledgeDocumentInsert {
  version: number;
  parent_document_id: string;
  change_notes?: string | null;
}


export interface IKnowledgeRepository {
  /** Document list for the library screen. `companyId === null` = all workspaces. */
  listDocuments(companyId: string | null, includeInactive: boolean): Promise<KnowledgeDocumentRow[]>;
  /** A document plus all of its versions (same root). */
  listVersions(rootId: string): Promise<KnowledgeDocumentRow[]>;
  insertDocument(input: KnowledgeDocumentInsert): Promise<{ id: string; company_id: string }>;
  getForProcessing(id: string): Promise<Pick<
    KnowledgeDocumentRow,
    "id" | "company_id" | "file_path" | "file_type" | "title"
  > | null>;
  markProcessing(id: string): Promise<void>;
  markReady(id: string, chunk_count: number, content_preview: string): Promise<void>;
  markFailed(id: string, message: string): Promise<void>;
  deleteChunks(document_id: string): Promise<void>;
  insertChunks(rows: KnowledgeChunkInsert[]): Promise<void>;
  getFilePath(id: string): Promise<string | null>;
  deleteDocument(id: string): Promise<void>;
  /** pgvector cosine similarity search scoped to a company. */
  searchSimilar(company_id: string, query_embedding: number[], limit: number): Promise<KnowledgeMatch[]>;
  getDocumentsByIds(ids: string[]): Promise<Array<{
    id: string;
    title: string;
    docCode: string | null;
    version: number;
    section: string | null;
    page: number | null;
    departmentId: string | null;
    updatedAt: string;
  }>>;
  /**
   * Ordered chunk content for a single document, used by SOP → lesson
   * conversion (`convertSopToLesson`). Content is joined by the caller.
   */
  getChunksContent(documentId: string, limit: number): Promise<string[]>;
  /**
   * Ordered chunk rows across multiple documents, used by multi-SOP course
   * generation (`generateAcademyCourse`).
   */
  getChunksForDocuments(documentIds: string[], limit: number): Promise<KnowledgeChunkContentRow[]>;

  // ---- SOP version lineage (used by sop-versions.functions.ts) ----
  /** Lineage anchor for a single document, or null when it does not exist. */
  getVersionAnchor(id: string): Promise<KnowledgeVersionAnchor | null>;
  /** Mark a document superseded (is_active = false, replaced_at = now). */
  markReplaced(id: string): Promise<void>;
  /** Insert the next revision in a lineage as the active version. */
  insertVersion(input: KnowledgeVersionInsert): Promise<{ id: string; company_id: string }>;
  /** Deactivate every document sharing a company + doc_code. */
  deactivateLineage(company_id: string, doc_code: string | null): Promise<void>;
  /** Make one document the active version of its lineage. */
  activateDocument(id: string): Promise<void>;
  /** Toggle the "critical SOP" acknowledgement flag. */
  setCritical(id: string, is_critical: boolean): Promise<void>;
  /** Update editable lifecycle/ownership metadata for one document. */
  updateMetadata(id: string, patch: KnowledgeMetadataPatch): Promise<void>;

  // ---- Visual understanding (Phase 5) ----
  /** Persist extracted embedded images with their best-effort chunk context. */
  insertDocumentImages(rows: KnowledgeDocumentImageInsert[]): Promise<void>;
  /** Approved images for a set of chunk indexes on one document (grounded citation). */
  getImagesForChunks(documentId: string, chunkIndexes: number[]): Promise<KnowledgeDocumentImageRow[]>;
  /** All images for a document (library/admin view). */
  getImagesForDocument(documentId: string): Promise<KnowledgeDocumentImageRow[]>;
}


export interface KnowledgeDocumentImageRow {
  id: string;
  document_id: string;
  company_id: string;
  chunk_index: number | null;
  storage_path: string;
  mime_type: string;
  caption: string | null;
  approved: boolean;
}
export interface KnowledgeDocumentImageInsert {
  document_id: string;
  company_id: string;
  chunk_index: number | null;
  storage_path: string;
  mime_type: string;
  caption?: string | null;
}

export type KnowledgeRepositoryFactory = (dataCtx: unknown) => IKnowledgeRepository;










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

/** Module-level entitlements used for UI gating. */
export interface LicenseEntitlements {
  unlimited: boolean;
  installId: string | null;
  customer: string | null;
  edition: string;
  seats: number | null;
  /**
   * Entitlement keys granted by signed tokens: OPSQAI Product keys, optional
   * add-ons and legacy module keys. Core platform capabilities are NOT listed
   * here — they are included with any valid installation license.
   */
  modules: string[];
  /** Company profile (business type) carried by the installation license. */
  profile?: string | null;
  /** Explicitly enabled OPSQAI Product keys. Subset of `modules`. */
  products?: string[];

  expiresAt: number | null; // unix seconds
  maintenanceExpiresAt: number | null; // unix seconds
  revoked: boolean;
  /**
   * Why the caller sees what it sees. `missing` (no license file at all) is
   * deliberately distinct from `expired` / `invalid` / `revoked` so the UI can
   * tell "never activated" apart from "activation is no longer valid".
   */
  status?: "licensed" | "missing" | "expired" | "invalid" | "revoked" | "unlimited";
  /** Human-readable detail for `status !== 'licensed'`. Never contains secrets. */
  statusDetail?: string | null;
}


export interface ILicensingProvider extends Provider {
  validate(): Promise<LicenseDetails>;
  heartbeat(input: HeartbeatInput): Promise<{ ok: boolean; nextAt?: string }>;
  /** Available update manifest (Self-Hosted only; Cloud returns null). */
  latestRelease(input: HeartbeatInput): Promise<{ version: string; url: string } | null>;
  /** Module entitlements for UI gating. */
  entitlements(): Promise<LicenseEntitlements>;
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
  /**
   * Force a token refresh. Optional: implementations without refresh
   * tokens may omit it. Returns null when the stored session can no
   * longer be refreshed (revoked / expired refresh token).
   */
  refreshSession?(): Promise<OpsqaiSession | null>;
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

// --------------------------------------------------------------------
// Exports (KB / FAQ / Workspace export & migration jobs)
// --------------------------------------------------------------------

export interface ExportJobRow {
  id: string;
  kind: string;
  mode: string;
  format: string;
  status: string;
  progress: number;
  sha256: string | null;
  bytes: number | null;
  file_count: number | null;
  deletion_status: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  storage_path: string | null;
}

export interface ExportJobCreateInput {
  companyId: string;
  kind: string;
  mode: string;
  format: string;
  createdBy: string;
}

export interface ExportJobCompleteInput {
  storagePath: string;
  sha256: string;
  bytes: number;
  fileCount: number;
  manifest: JsonLike;
}

export interface ExportKbSnapshot {
  documents: Record<string, unknown>[];
  chunks: Record<string, unknown>[];
  tags: Record<string, unknown>[];
  categories: Record<string, unknown>[];
}

export interface ExportFaqSnapshot {
  faqs: Record<string, unknown>[];
}

export interface ExportWorkspaceSnapshot {
  kb: ExportKbSnapshot;
  faq: ExportFaqSnapshot;
  company: Record<string, unknown> | null;
  users: Record<string, unknown>[];
  roles: Record<string, unknown>[];
  departments: Record<string, unknown>[];
  brand_assets: Record<string, unknown>[];
  sop_templates: Record<string, unknown>[];
  settings: Record<string, unknown> | null;
}

export interface ExportAuditInput {
  companyId: string;
  userId: string;
  module: string;
  action: string;
  resource: string;
  payload: JsonLike | null;
  severity: string;
  success: boolean;
}

export interface IExportRepository {
  createJob(input: ExportJobCreateInput): Promise<{ id: string }>;
  markCompleted(id: string, patch: ExportJobCompleteInput): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  markDeleted(id: string, deletionTyped: string | null): Promise<void>;
  listJobs(companyId: string, limit: number): Promise<ExportJobRow[]>;
  getStoragePath(id: string): Promise<string | null>;

  snapshotKb(companyId: string): Promise<ExportKbSnapshot>;
  snapshotFaq(companyId: string): Promise<ExportFaqSnapshot>;
  snapshotWorkspace(companyId: string): Promise<ExportWorkspaceSnapshot>;

  /** Deletes KB documents+chunks for a company. Returns count of documents removed. */
  deleteKbData(companyId: string): Promise<number>;
  /** Deletes FAQs for a company. Returns count of FAQs removed. */
  deleteFaqData(companyId: string): Promise<number>;

  writeAudit(input: ExportAuditInput): Promise<void>;
}

export type ExportRepositoryFactory = (dataCtx: unknown) => IExportRepository;

// --------------------------------------------------------------------
// Academy (learning paths / chapters / lessons / enrollments / quizzes /
// certificates / analytics). Company-scoped everywhere except the
// current-user-scoped learner methods, which take `userId` explicitly.
// --------------------------------------------------------------------

export interface AcademyPathRow {
  id: string;
  company_id: string;
  department_id: string | null;
  department_name: string | null;
  title: string;
  description: string | null;
  language: string;
  target_role: string | null;
  target_position: string | null;
  experience_level: string | null;
  employment_type: string | null;
  mandatory: boolean;
  passing_score: number;
  difficulty: string;
  publish_status: "draft" | "published" | "archived";
  order_index: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcademyPathUpsertInput {
  id?: string;
  companyId: string;
  departmentId?: string | null;
  title: string;
  description?: string | null;
  language: string;
  targetRole?: string | null;
  targetPosition?: string | null;
  experienceLevel?: string | null;
  employmentType?: string | null;
  mandatory: boolean;
  passingScore: number;
  difficulty: string;
  publishStatus: "draft" | "published" | "archived";
  createdBy: string;
}

export interface AcademyChapterRow {
  id: string;
  company_id: string;
  path_id: string;
  title: string;
  summary: string | null;
  order_index: number;
  created_at: string;
}

export interface AcademyChapterUpsertInput {
  id?: string;
  companyId: string;
  pathId: string;
  title: string;
  summary?: string | null;
  orderIndex: number;
}

export interface AcademyLessonRow {
  id: string;
  company_id: string;
  chapter_id: string;
  title: string;
  objectives: string[];
  explanation: string | null;
  examples: string | null;
  best_practices: string | null;
  summary: string | null;
  language: string;
  estimated_minutes: number;
  source_document_id: string | null;
  source_document_version: number | null;
  publish_status: "draft" | "published" | "archived";
  order_index: number;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Enrichment supplied by getLesson().
  chapter_path_id?: string;
  chapter_title?: string;
  path_title?: string;
  path_passing_score?: number;
  path_language?: string;
}

export interface AcademyLessonUpsertInput {
  id?: string;
  companyId: string;
  chapterId: string;
  title: string;
  objectives: string[];
  explanation?: string | null;
  examples?: string | null;
  bestPractices?: string | null;
  summary?: string | null;
  language: string;
  estimatedMinutes: number;
  sourceDocumentId?: string | null;
  sourceDocumentVersion?: number | null;
  publishStatus: "draft" | "published" | "archived";
  orderIndex: number;
  createdBy: string;
}

export interface AcademyLessonVersionRow {
  id: string;
  lesson_id: string;
  version: number;
  snapshot: JsonLike;
  created_at: string;
}

export interface AcademyEnrollmentRow {
  id: string;
  company_id: string;
  path_id: string;
  user_id: string;
  status: "assigned" | "in_progress" | "completed" | "overdue" | "revoked";
  mandatory: boolean;
  priority: string;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  assigned_by: string | null;
  created_at: string;
}

export interface AcademyEnrollmentUpsertInput {
  companyId: string;
  pathId: string;
  userId: string;
  status?: AcademyEnrollmentRow["status"];
  mandatory: boolean;
  priority?: string;
  dueAt?: string | null;
  assignedBy: string;
}

export interface AcademyLessonProgressRow {
  id: string;
  company_id: string;
  enrollment_id: string;
  lesson_id: string;
  user_id: string;
  status: "not_started" | "in_progress" | "completed";
  attempts: number;
  last_score: number | null;
  time_spent_seconds: number;
  notes: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
}

export interface AcademyLessonProgressUpsertInput {
  companyId: string;
  enrollmentId: string;
  lessonId: string;
  userId: string;
  status?: AcademyLessonProgressRow["status"];
  attempts?: number;
  lastScore?: number | null;
  timeSpentSeconds?: number;
  notes?: string | null;
  completedAt?: string | null;
}

export interface AcademyQuizAttemptRow {
  id: string;
  company_id: string | null;
  lesson_id: string;
  user_id: string;
  questions: JsonLike;
  answers: JsonLike;
  score: number;
  passed: boolean;
  duration_seconds: number | null;
  created_at: string;
}

export interface AcademyQuizAttemptCreateInput {
  companyId: string | null;
  lessonId: string;
  userId: string;
  questions: JsonLike;
}

export interface AcademyQuizAttemptGradeInput {
  answers: JsonLike;
  score: number;
  passed: boolean;
  durationSeconds?: number | null;
}

export interface AcademyCertificateRow {
  id: string;
  company_id: string;
  enrollment_id: string;
  path_id: string;
  user_id: string;
  certificate_code: string;
  final_score: number;
  pdf_path: string | null;
  qr_payload: string | null;
  issued_at: string;
  revoked_at: string | null;
  path_title?: string;
}

export interface AcademyCertificateUpsertInput {
  companyId: string;
  enrollmentId: string;
  pathId: string;
  userId: string;
  finalScore: number;
}

export interface AcademyCertificateVerification {
  valid: boolean;
  issuedAt: string;
  score: number;
  pathTitle: string;
  company: string;
  recipient: string;
  certificateCode: string;
}

export interface AcademyRetrainingEventRow {
  id: string;
  company_id: string;
  path_id: string;
  user_id: string;
  reason: string;
  triggered_by: string | null;
  created_at: string;
}

export interface AcademyRetrainingEventCreateInput {
  companyId: string;
  pathId: string;
  userId: string;
  reason: string;
  triggeredBy?: string | null;
}

export interface AcademySettingsRow {
  company_id: string;
  passing_score: number;
  quiz_min: number;
  quiz_max: number;
  default_difficulty: string;
  certificate_template: JsonLike;
  languages: string[];
}

export interface AcademySettingsUpsertInput {
  companyId: string;
  passingScore: number;
  quizMin: number;
  quizMax: number;
  defaultDifficulty: string;
  languages: string[];
}

export interface AcademyResolveTargetsInput {
  companyId: string;
  userIds: string[];
  departmentIds: string[];
  roles: string[];
  entireCompany: boolean;
}

export interface AcademyKpis {
  [key: string]: JsonLike;
}

export interface AcademyHeatmapRow {
  [key: string]: JsonLike;
}

export interface AcademyDepartmentPerformanceRow {
  [key: string]: JsonLike;
}

export interface AcademyCourseAnalyticsRow {
  id: string;
  title: string;
  mandatory: boolean;
  publish_status: string;
  assigned_users: number;
  completed: number;
  in_progress: number;
  overdue: number;
  avg_completion_minutes: number | null;
  avg_quiz_score: number | null;
  completion_percent: number;
  certificates_issued: number;
}

export interface AcademyCohortRow {
  enrollment_id: string;
  user_id: string;
  name: string;
  department_id: string | null;
  status: string;
  mandatory: boolean;
  priority: string;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  progress_percent: number;
  last_activity_at: string | null;
  is_overdue: boolean;
}

export interface AcademyDepartmentRow {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface AcademyDepartmentUpsertInput {
  id?: string;
  companyId: string;
  name: string;
  description?: string | null;
}

export interface AcademyPathRefRow {
  id: string;
  company_id: string;
  title: string;
}

export interface AcademyEnrollmentPairRow {
  path_id: string;
  user_id: string;
}

export interface AcademyAssignTargets {
  users: { id: string; name: string; department_id: string | null }[];
  departments: { id: string; name: string }[];
  roles: string[];
}

export interface AcademyNotificationInput {
  companyId: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  payload: Record<string, unknown>;
}

export interface AcademyProfileRef {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface AcademyEnrollmentWithProfileRow extends AcademyEnrollmentRow {
  profile: AcademyProfileRef | null;
}

export interface AcademyEnrollmentPathRef {
  id: string;
  title: string;
  description: string | null;
  language: string;
  passing_score: number;
  department_name: string | null;
}

export interface AcademyEnrollmentWithPathRow extends AcademyEnrollmentRow {
  academy_learning_paths: AcademyEnrollmentPathRef | null;
}

export interface AcademyEnrichedEnrollmentRow {
  id: string;
  status: AcademyEnrollmentRow["status"];
  mandatory: boolean;
  priority: string;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  path: {
    id: string;
    title: string;
    description: string | null;
    language: string;
    department: string | null;
  };
  progress: {
    total_lessons: number;
    completed_lessons: number;
    percent: number;
    estimated_minutes: number;
  };
  assigned_by: { id: string; name: string } | null;
  certificate: { id: string; code: string } | null;
  is_overdue: boolean;
}

export interface AcademyTrainingSummary {
  mandatory_active: number;
  certificates: number;
  average_quiz_score: number | null;
  learning_progress_percent: number;
  upcoming_deadlines: number;
}

export interface IAcademyRepository {
  // Learning paths
  listLearningPaths(
    companyId: string,
    filter?: { departmentId?: string | null; publishStatus?: string | null },
  ): Promise<AcademyPathRow[]>;
  getLearningPath(id: string): Promise<{
    path: AcademyPathRow;
    chapters: AcademyChapterRow[];
    lessons: AcademyLessonRow[];
  } | null>;
  upsertLearningPath(input: AcademyPathUpsertInput): Promise<{ id: string }>;
  deleteLearningPath(id: string): Promise<void>;

  // Chapters
  upsertChapter(input: AcademyChapterUpsertInput): Promise<{ id: string }>;
  deleteChapter(id: string): Promise<void>;

  // Lessons
  getLesson(id: string): Promise<AcademyLessonRow | null>;
  upsertLesson(input: AcademyLessonUpsertInput): Promise<{ id: string }>;
  deleteLesson(id: string): Promise<void>;
  listLessonVersions(lessonId: string): Promise<AcademyLessonVersionRow[]>;
  restoreLessonVersion(lessonId: string, version: number): Promise<void>;

  // Quiz
  createQuizAttempt(input: AcademyQuizAttemptCreateInput): Promise<{ id: string }>;
  getQuizAttempt(id: string): Promise<AcademyQuizAttemptRow | null>;
  gradeQuizAttempt(id: string, patch: AcademyQuizAttemptGradeInput): Promise<void>;

  // Enrollments
  enroll(input: AcademyEnrollmentUpsertInput): Promise<{ id: string; existing: boolean }>;
  assignEnrollments(rows: AcademyEnrollmentUpsertInput[]): Promise<{ count: number }>;
  getEnrollment(id: string): Promise<AcademyEnrollmentRow | null>;
  listEnrollmentsByUser(userId: string): Promise<AcademyEnrollmentRow[]>;
  listEnrollmentsByPath(pathId: string): Promise<AcademyEnrollmentRow[]>;
  startEnrollment(id: string, userId: string): Promise<void>;
  completeEnrollment(id: string): Promise<void>;
  removeEnrollment(id: string): Promise<void>;

  // Progress
  listLessonProgress(enrollmentId: string): Promise<AcademyLessonProgressRow[]>;
  upsertLessonProgress(input: AcademyLessonProgressUpsertInput): Promise<void>;
  saveLessonNotes(input: {
    enrollmentId: string;
    lessonId: string;
    userId: string;
    companyId: string;
    notes: string;
  }): Promise<void>;

  // Certificates
  listCertificatesByUser(userId: string): Promise<AcademyCertificateRow[]>;
  getCertificate(id: string): Promise<AcademyCertificateRow | null>;
  upsertCertificate(input: AcademyCertificateUpsertInput): Promise<AcademyCertificateRow>;
  markCertificatePdf(id: string, pdfPath: string, qrPayload: string): Promise<void>;
  verifyCertificate(code: string): Promise<AcademyCertificateVerification | null>;

  // Retraining
  listRetrainingEvents(companyId: string): Promise<AcademyRetrainingEventRow[]>;
  createRetrainingEvent(input: AcademyRetrainingEventCreateInput): Promise<{ id: string }>;

  // Settings
  getSettings(companyId: string): Promise<AcademySettingsRow | null>;
  saveSettings(input: AcademySettingsUpsertInput): Promise<void>;

  // Targeting
  resolveTargets(input: AcademyResolveTargetsInput): Promise<string[]>;

  // Analytics
  getKpis(companyId: string): Promise<AcademyKpis>;
  getHeatmap(companyId: string): Promise<AcademyHeatmapRow[]>;
  getDepartmentPerformance(companyId: string): Promise<AcademyDepartmentPerformanceRow[]>;
  getCourseAnalytics(companyId: string): Promise<AcademyCourseAnalyticsRow[]>;
  getCourseCohort(pathId: string): Promise<AcademyCohortRow[]>;

  // Departments (academy_departments on Cloud; public.departments on Self-Hosted)
  listDepartments(companyId: string): Promise<AcademyDepartmentRow[]>;
  upsertDepartment(input: AcademyDepartmentUpsertInput): Promise<{ id: string }>;

  // Enriched read models for learner dashboards (My Training card view + summary widget)
  listMyTrainingEnrollments(userId: string): Promise<AcademyEnrichedEnrollmentRow[]>;
  getMyTrainingSummary(userId: string): Promise<AcademyTrainingSummary>;
  /** Legacy "My Enrollments" shape carrying a nested `academy_learning_paths` object. */
  listEnrollmentsByUserWithPath(userId: string): Promise<AcademyEnrollmentWithPathRow[]>;
  /** Assignment listing carrying a nested `profile` object per learner. */
  listEnrollmentsByPathWithProfile(pathId: string): Promise<AcademyEnrollmentWithProfileRow[]>;

  // Bulk-assignment support (multi-target assign flow)
  listLearningPathsByIds(ids: string[]): Promise<AcademyPathRefRow[]>;
  listExistingEnrollmentPairs(pathIds: string[], userIds: string[]): Promise<AcademyEnrollmentPairRow[]>;

  /** Assignable targets for the manager's company (users, departments, roles). */
  getAssignTargets(companyId: string): Promise<AcademyAssignTargets>;
  /** Fire-and-forget in-app notifications for newly assigned training. */
  createNotifications(rows: AcademyNotificationInput[]): Promise<void>;
}

export type AcademyRepositoryFactory = (dataCtx: unknown) => IAcademyRepository;

// --------------------------------------------------------------------
// Calendar repository — local calendar store (Self-Hosted).
// Backs public.calendar_events + public.calendar_feed_tokens. Cloud keeps
// its own implementation inside calendar-core.server.ts, so this surface is
// only registered by the Self-Hosted bootstrap.
// --------------------------------------------------------------------

export interface LocalCalendarEventRow {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
}

export interface LocalCalendarEventInput {
  id?: string | undefined;
  ownerUserId: string;
  title: string;
  description: string | null;
  kind: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
}

export interface ICalendarRepository {
  listEvents(ownerUserId: string, from: string, to: string): Promise<LocalCalendarEventRow[]>;
  upsertEvent(input: LocalCalendarEventInput): Promise<{ id: string }>;
  deleteEvent(ownerUserId: string, id: string): Promise<void>;
  getActiveToken(userId: string): Promise<string | null>;
  createToken(userId: string, token: string): Promise<void>;
  revokeTokens(userId: string): Promise<void>;
  resolveToken(token: string): Promise<{ id: string; userId: string } | null>;
  touchToken(id: string): Promise<void>;
}

export type CalendarRepositoryFactory = (dataCtx: unknown) => ICalendarRepository;

// --------------------------------------------------------------------
// Presence + time off repository (account menu).
// Cloud: Supabase (RLS as the signed-in user).
// Self-Hosted: local PostgreSQL (migration 0028_presence_time_off.sql).
// --------------------------------------------------------------------

export type PresenceStatus = "available" | "busy" | "away" | "dnd";

export interface PresenceRecord {
  userId: string;
  status: PresenceStatus;
  message: string | null;
  until: string | null;
}

export type TimeOffStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface TimeOffRecord {
  id: string;
  userId: string;
  companyId: string | null;
  startsOn: string;
  endsOn: string;
  reason: string | null;
  status: TimeOffStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  calendarEventId: string | null;
  createdAt: string;
  requesterName?: string | null;
}

export interface IPresenceRepository {
  getPresence(userId: string): Promise<PresenceRecord | null>;
  setPresence(
    userId: string,
    patch: { status: PresenceStatus; message: string | null; until: string | null },
  ): Promise<PresenceRecord>;
  listPresence(userIds: string[]): Promise<PresenceRecord[]>;

  createTimeOff(input: {
    userId: string;
    companyId: string | null;
    startsOn: string;
    endsOn: string;
    reason: string | null;
    status: TimeOffStatus;
  }): Promise<TimeOffRecord>;
  listMyTimeOff(userId: string): Promise<TimeOffRecord[]>;
  listCompanyTimeOff(companyId: string | null): Promise<TimeOffRecord[]>;
  getTimeOff(id: string): Promise<TimeOffRecord | null>;
  updateTimeOff(
    id: string,
    patch: {
      status?: TimeOffStatus;
      approvedBy?: string | null;
      approvedAt?: string | null;
      calendarEventId?: string | null;
    },
  ): Promise<TimeOffRecord>;
}

export type PresenceRepositoryFactory = (dataCtx: unknown) => IPresenceRepository;
