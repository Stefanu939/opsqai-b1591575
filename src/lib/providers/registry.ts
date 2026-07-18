// Provider registry.
//
// A single boot site (see `src/lib/platform/bootstrap.ts`) binds the
// active provider for each capability. Feature code resolves providers
// through `getProvider(...)`, never by direct import — that is what keeps
// Self-Hosted from pulling any Supabase module into its bundle.

import { Capability } from "@/lib/platform";
import type {
  IAuthAdminProvider,
  IAuthProvider,
  IBackupService,
  IBrowserAuthProvider,
  ICompanyRepository,
  IDepartmentRepository,
  IFaqRepository,
  IFeedbackRepository,
  IIntegrationRepository,
  IKnowledgeGapRepository,
  ILicensingProvider,
  IMessageRepository,
  INotificationProvider,
  IProfileRepository,
  IRoleRepository,
  ISecretsCipher,
  IStorageProvider,
  ITelemetrySink,
  IThreadRepository,
  IUserRepository,
  CompanyRepositoryFactory,
  DepartmentRepositoryFactory,
  FaqRepositoryFactory,
  FeedbackRepositoryFactory,
  IntegrationRepositoryFactory,
  KnowledgeGapRepositoryFactory,
  MessageRepositoryFactory,
  ProfileRepositoryFactory,
  RoleRepositoryFactory,
  ThreadRepositoryFactory,
} from "./interfaces";

interface Registry {
  auth?: IAuthProvider;
  authAdmin?: IAuthAdminProvider;
  browserAuth?: IBrowserAuthProvider;
  users?: IUserRepository;
  storage?: IStorageProvider;
  notifications?: INotificationProvider;
  licensing?: ILicensingProvider;
  cipher?: ISecretsCipher;
  backup?: IBackupService;
  telemetry?: ITelemetrySink;
  profileFactory?: ProfileRepositoryFactory;
  adminProfileFactory?: ProfileRepositoryFactory;
  roleFactory?: RoleRepositoryFactory;
  adminRoleFactory?: RoleRepositoryFactory;
  companyFactory?: CompanyRepositoryFactory;
  adminCompanyFactory?: CompanyRepositoryFactory;
  departmentFactory?: DepartmentRepositoryFactory;
  adminDepartmentFactory?: DepartmentRepositoryFactory;
  threadFactory?: ThreadRepositoryFactory;
  messageFactory?: MessageRepositoryFactory;
  feedbackFactory?: FeedbackRepositoryFactory;
  knowledgeGapFactory?: KnowledgeGapRepositoryFactory;
  integrationFactory?: IntegrationRepositoryFactory;
  faqFactory?: FaqRepositoryFactory;
}



const registry: Registry = {};

export function registerAuthProvider(p: IAuthProvider): void {
  registry.auth = p;
}
export function registerAuthAdminProvider(p: IAuthAdminProvider): void {
  registry.authAdmin = p;
}
export function registerBrowserAuthProvider(p: IBrowserAuthProvider): void {
  registry.browserAuth = p;
}
export function registerUserRepository(p: IUserRepository): void {
  registry.users = p;
}
export function registerStorageProvider(p: IStorageProvider): void {
  registry.storage = p;
}
export function registerNotificationProvider(p: INotificationProvider): void {
  registry.notifications = p;
}
export function registerLicensingProvider(p: ILicensingProvider): void {
  registry.licensing = p;
}
export function registerSecretsCipher(p: ISecretsCipher): void {
  registry.cipher = p;
}
export function registerBackupService(p: IBackupService): void {
  registry.backup = p;
}
export function registerTelemetrySink(p: ITelemetrySink): void {
  registry.telemetry = p;
}
export function registerProfileRepositoryFactory(f: ProfileRepositoryFactory): void {
  registry.profileFactory = f;
}
export function registerAdminProfileRepositoryFactory(f: ProfileRepositoryFactory): void {
  registry.adminProfileFactory = f;
}
export function registerRoleRepositoryFactory(f: RoleRepositoryFactory): void {
  registry.roleFactory = f;
}
export function registerAdminRoleRepositoryFactory(f: RoleRepositoryFactory): void {
  registry.adminRoleFactory = f;
}
export function registerCompanyRepositoryFactory(f: CompanyRepositoryFactory): void {
  registry.companyFactory = f;
}
export function registerAdminCompanyRepositoryFactory(f: CompanyRepositoryFactory): void {
  registry.adminCompanyFactory = f;
}
export function registerDepartmentRepositoryFactory(f: DepartmentRepositoryFactory): void {
  registry.departmentFactory = f;
}
export function registerAdminDepartmentRepositoryFactory(f: DepartmentRepositoryFactory): void {
  registry.adminDepartmentFactory = f;
}
export function registerThreadRepositoryFactory(f: ThreadRepositoryFactory): void {
  registry.threadFactory = f;
}
export function registerMessageRepositoryFactory(f: MessageRepositoryFactory): void {
  registry.messageFactory = f;
}
export function registerFeedbackRepositoryFactory(f: FeedbackRepositoryFactory): void {
  registry.feedbackFactory = f;
}
export function registerKnowledgeGapRepositoryFactory(f: KnowledgeGapRepositoryFactory): void {
  registry.knowledgeGapFactory = f;
}
export function registerIntegrationRepositoryFactory(f: IntegrationRepositoryFactory): void {
  registry.integrationFactory = f;
}
export function registerFaqRepositoryFactory(f: FaqRepositoryFactory): void {
  registry.faqFactory = f;
}




function required<T>(value: T | undefined, capability: Capability): T {
  if (!value) {
    throw new Error(
      `No provider registered for capability "${capability}". ` +
        `Call the platform bootstrap before invoking feature code.`,
    );
  }
  return value;
}

export const getAuthProvider = (): IAuthProvider =>
  required(registry.auth, Capability.Authentication);
export const getAuthAdminProvider = (): IAuthAdminProvider =>
  required(registry.authAdmin, Capability.Authentication);
export const getBrowserAuthProvider = (): IBrowserAuthProvider =>
  required(registry.browserAuth, Capability.Authentication);
export const hasBrowserAuthProvider = (): boolean => Boolean(registry.browserAuth);
export const getUserRepository = (): IUserRepository =>
  required(registry.users, Capability.Authentication);
export const getStorageProvider = (): IStorageProvider =>
  required(registry.storage, Capability.Storage);
export const getNotificationProvider = (): INotificationProvider =>
  required(registry.notifications, Capability.SMTP);
export const getLicensingProvider = (): ILicensingProvider =>
  required(registry.licensing, Capability.Licensing);
export const getSecretsCipher = (): ISecretsCipher => {
  if (!registry.cipher) throw new Error("No secrets cipher registered");
  return registry.cipher;
};
export const getBackupService = (): IBackupService => {
  if (!registry.backup) throw new Error("No backup service registered");
  return registry.backup;
};
export const getTelemetrySink = (): ITelemetrySink =>
  required(registry.telemetry, Capability.Telemetry);

/**
 * Resolve a request-scoped profile repository. `dataCtx` is the opaque
 * data-access handle produced by `requireAuth` (Cloud: user-scoped
 * SupabaseClient; Self-Hosted: ignored — the factory captured its pg
 * pool at bootstrap).
 */
export function getProfileRepository(dataCtx: unknown): IProfileRepository {
  if (!registry.profileFactory) {
    throw new Error("No profile repository factory registered");
  }
  return registry.profileFactory(dataCtx);
}
/** Admin-privileged profile repository (Cloud: service-role; Self-Hosted: same as user-scoped). */
export function getAdminProfileRepository(): IProfileRepository {
  if (!registry.adminProfileFactory) {
    throw new Error("No admin profile repository factory registered");
  }
  return registry.adminProfileFactory(undefined);
}
export function getRoleRepository(dataCtx: unknown): IRoleRepository {
  if (!registry.roleFactory) {
    throw new Error("No role repository factory registered");
  }
  return registry.roleFactory(dataCtx);
}
export function getAdminRoleRepository(): IRoleRepository {
  if (!registry.adminRoleFactory) {
    throw new Error("No admin role repository factory registered");
  }
  return registry.adminRoleFactory(undefined);
}
export function getCompanyRepository(dataCtx: unknown): ICompanyRepository {
  if (!registry.companyFactory) {
    throw new Error("No company repository factory registered");
  }
  return registry.companyFactory(dataCtx);
}
export function getAdminCompanyRepository(): ICompanyRepository {
  if (!registry.adminCompanyFactory) {
    throw new Error("No admin company repository factory registered");
  }
  return registry.adminCompanyFactory(undefined);
}
export function getDepartmentRepository(dataCtx: unknown): IDepartmentRepository {
  if (!registry.departmentFactory) {
    throw new Error("No department repository factory registered");
  }
  return registry.departmentFactory(dataCtx);
}
export function getAdminDepartmentRepository(): IDepartmentRepository {
  if (!registry.adminDepartmentFactory) {
    throw new Error("No admin department repository factory registered");
  }
  return registry.adminDepartmentFactory(undefined);
}
export function getThreadRepository(dataCtx: unknown): IThreadRepository {
  if (!registry.threadFactory) throw new Error("No thread repository factory registered");
  return registry.threadFactory(dataCtx);
}
export function getMessageRepository(dataCtx: unknown): IMessageRepository {
  if (!registry.messageFactory) throw new Error("No message repository factory registered");
  return registry.messageFactory(dataCtx);
}
export function getFeedbackRepository(dataCtx: unknown): IFeedbackRepository {
  if (!registry.feedbackFactory) throw new Error("No feedback repository factory registered");
  return registry.feedbackFactory(dataCtx);
}
export function getKnowledgeGapRepository(dataCtx: unknown): IKnowledgeGapRepository {
  if (!registry.knowledgeGapFactory) {
    throw new Error("No knowledge gap repository factory registered");
  }
  return registry.knowledgeGapFactory(dataCtx);
}
export function getIntegrationRepository(dataCtx: unknown): IIntegrationRepository {
  if (!registry.integrationFactory) {
    throw new Error("No integration repository factory registered");
  }
  return registry.integrationFactory(dataCtx);
}
export function getFaqRepository(dataCtx: unknown): IFaqRepository {
  if (!registry.faqFactory) throw new Error("No FAQ repository factory registered");
  return registry.faqFactory(dataCtx);
}

/** Test-only reset. */
export function __resetProviderRegistryForTests(): void {
  registry.auth = undefined;
  registry.authAdmin = undefined;
  registry.browserAuth = undefined;
  registry.users = undefined;
  registry.storage = undefined;
  registry.notifications = undefined;
  registry.licensing = undefined;
  registry.cipher = undefined;
  registry.backup = undefined;
  registry.telemetry = undefined;
  registry.profileFactory = undefined;
  registry.adminProfileFactory = undefined;
  registry.roleFactory = undefined;
  registry.adminRoleFactory = undefined;
  registry.companyFactory = undefined;
  registry.adminCompanyFactory = undefined;
  registry.departmentFactory = undefined;
  registry.adminDepartmentFactory = undefined;
  registry.threadFactory = undefined;
  registry.messageFactory = undefined;
  registry.feedbackFactory = undefined;
  registry.knowledgeGapFactory = undefined;
  registry.integrationFactory = undefined;
  registry.faqFactory = undefined;
}

