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
  ICompanyRepository,
  IDepartmentRepository,
  ILicensingProvider,
  INotificationProvider,
  IProfileRepository,
  IRoleRepository,
  IUserRepository,
} from "@/lib/providers/interfaces";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  registerAdminCompanyRepositoryFactory,
  registerAdminDepartmentRepositoryFactory,
  registerAdminProfileRepositoryFactory,
  registerAdminRoleRepositoryFactory,
  registerAuthAdminProvider,
  registerCompanyRepositoryFactory,
  registerDepartmentRepositoryFactory,
  registerFeedbackRepositoryFactory,
  registerIntegrationRepositoryFactory,
  registerFaqRepositoryFactory,
  registerKnowledgeRepositoryFactory,
  registerKnowledgeGapRepositoryFactory,
  registerMessageRepositoryFactory,
  registerProfileRepositoryFactory,
  registerRoleRepositoryFactory,
  registerThreadRepositoryFactory,
} from "@/lib/providers/registry";

import { createSupabaseAuthProvider } from "./supabase-auth.server";
import { createSupabaseAuthAdminProvider } from "./supabase-auth-admin.server";
import { createSupabaseStorageProvider } from "./supabase-storage.server";
import { createSupabaseProfileRepository } from "./supabase-profile-repository.server";
import { createSupabaseRoleRepository } from "./supabase-role-repository.server";
import { createSupabaseCompanyRepository } from "./supabase-company-repository.server";
import { createSupabaseDepartmentRepository } from "./supabase-department-repository.server";
import { createSupabaseThreadRepository } from "./supabase-thread-repository.server";
import { createSupabaseMessageRepository } from "./supabase-message-repository.server";
import { createSupabaseFeedbackRepository } from "./supabase-feedback-repository.server";
import { createSupabaseKnowledgeGapRepository } from "./supabase-knowledge-gap-repository.server";
import { createSupabaseIntegrationRepository } from "./supabase-integration-repository.server";
import { createSupabaseFaqRepository } from "./supabase-faq-repository.server";
import { createSupabaseKnowledgeRepository } from "./supabase-knowledge-repository.server";


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

/**
 * Async-proxy pattern: repository methods lazy-load the service-role
 * Supabase client the first time they're called so this module never
 * pulls `client.server.ts` into the client import graph.
 */
function adminProfileProxy(
  getAdmin: () => Promise<SupabaseClient<Database>>,
): IProfileRepository {
  return {
    findByUserId: async (id) =>
      createSupabaseProfileRepository(await getAdmin()).findByUserId(id),
    updateByUserId: async (id, patch) =>
      createSupabaseProfileRepository(await getAdmin()).updateByUserId(id, patch),
    listByCompany: async (cid) =>
      createSupabaseProfileRepository(await getAdmin()).listByCompany(cid),
    create: async (input) =>
      createSupabaseProfileRepository(await getAdmin()).create(input),
    deleteByUserId: async (id) =>
      createSupabaseProfileRepository(await getAdmin()).deleteByUserId(id),
  };
}

function adminRoleProxy(
  getAdmin: () => Promise<SupabaseClient<Database>>,
): IRoleRepository {
  return {
    listRolesForUser: async (id) =>
      createSupabaseRoleRepository(await getAdmin()).listRolesForUser(id),
    hasRole: async (id, r) =>
      createSupabaseRoleRepository(await getAdmin()).hasRole(id, r),
    addRole: async (id, r, c) =>
      createSupabaseRoleRepository(await getAdmin()).addRole(id, r, c),
    removeRole: async (id, r) =>
      createSupabaseRoleRepository(await getAdmin()).removeRole(id, r),
    removeAllRoles: async (id) =>
      createSupabaseRoleRepository(await getAdmin()).removeAllRoles(id),
    removeNonPlatformRoles: async (id) =>
      createSupabaseRoleRepository(await getAdmin()).removeNonPlatformRoles(id),
    isPlatformOwner: async (id) =>
      createSupabaseRoleRepository(await getAdmin()).isPlatformOwner(id),
    hasPermission: async (id, p) =>
      createSupabaseRoleRepository(await getAdmin()).hasPermission(id, p),
    listAssignments: async (ids) =>
      createSupabaseRoleRepository(await getAdmin()).listAssignments(ids),
    listAssignmentsDetailed: async (ids) =>
      createSupabaseRoleRepository(await getAdmin()).listAssignmentsDetailed(ids),
    listPermissionsForRole: async (r) =>
      createSupabaseRoleRepository(await getAdmin()).listPermissionsForRole(r),
  };
}

function adminCompanyProxy(
  getAdmin: () => Promise<SupabaseClient<Database>>,
): ICompanyRepository {
  return {
    findById: async (id) =>
      createSupabaseCompanyRepository(await getAdmin()).findById(id),
    findSystemCompany: async () =>
      createSupabaseCompanyRepository(await getAdmin()).findSystemCompany(),
    findFirstActive: async () =>
      createSupabaseCompanyRepository(await getAdmin()).findFirstActive(),
    list: async () => createSupabaseCompanyRepository(await getAdmin()).list(),
  };
}

function adminDepartmentProxy(
  getAdmin: () => Promise<SupabaseClient<Database>>,
): IDepartmentRepository {
  return {
    list: async (cid) =>
      createSupabaseDepartmentRepository(await getAdmin()).list(cid),
    findByNameCI: async (cid, n) =>
      createSupabaseDepartmentRepository(await getAdmin()).findByNameCI(cid, n),
    create: async (input) =>
      createSupabaseDepartmentRepository(await getAdmin()).create(input),
    delete: async (id, cid) =>
      createSupabaseDepartmentRepository(await getAdmin()).delete(id, cid),
  };
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

  // Wave C.2a.1 — profile + role repositories.
  registerProfileRepositoryFactory((ctx) =>
    createSupabaseProfileRepository(ctx as SupabaseClient<Database>),
  );
  registerRoleRepositoryFactory((ctx) =>
    createSupabaseRoleRepository(ctx as SupabaseClient<Database>),
  );
  registerCompanyRepositoryFactory((ctx) =>
    createSupabaseCompanyRepository(ctx as SupabaseClient<Database>),
  );
  registerDepartmentRepositoryFactory((ctx) =>
    createSupabaseDepartmentRepository(ctx as SupabaseClient<Database>),
  );
  // Wave C.2b.1 — chat / feedback / knowledge-gap / integrations.
  registerThreadRepositoryFactory((ctx) =>
    createSupabaseThreadRepository(ctx as SupabaseClient<Database>),
  );
  registerMessageRepositoryFactory((ctx) =>
    createSupabaseMessageRepository(ctx as SupabaseClient<Database>),
  );
  registerFeedbackRepositoryFactory((ctx) =>
    createSupabaseFeedbackRepository(ctx as SupabaseClient<Database>),
  );
  registerKnowledgeGapRepositoryFactory((ctx) =>
    createSupabaseKnowledgeGapRepository(ctx as SupabaseClient<Database>),
  );
  registerIntegrationRepositoryFactory((ctx) =>
    createSupabaseIntegrationRepository(ctx as SupabaseClient<Database>),
  );
  registerFaqRepositoryFactory((ctx) =>
    createSupabaseFaqRepository(ctx as SupabaseClient<Database>),
  );
  registerKnowledgeRepositoryFactory((ctx) =>
    createSupabaseKnowledgeRepository(ctx as SupabaseClient<Database>),
  );


  // Admin flavour: lazy-load service-role client so this module does not
  // pull `client.server.ts` into the client graph.
  let adminClient: SupabaseClient<Database> | null = null;
  const getAdmin = async (): Promise<SupabaseClient<Database>> => {
    if (adminClient) return adminClient;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    adminClient = supabaseAdmin as SupabaseClient<Database>;
    return adminClient;
  };

  registerAdminProfileRepositoryFactory(() => adminProfileProxy(getAdmin));
  registerAdminRoleRepositoryFactory(() => adminRoleProxy(getAdmin));
  registerAdminCompanyRepositoryFactory(() => adminCompanyProxy(getAdmin));
  registerAdminDepartmentRepositoryFactory(() => adminDepartmentProxy(getAdmin));

  // Wave C.2a.1.c — auth admin surface.
  registerAuthAdminProvider(
    createSupabaseAuthAdminProvider({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getAdmin: async () => (await getAdmin()) as any,
    }),
  );
}

