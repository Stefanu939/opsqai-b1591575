// Session bootstrap — the browser calls this once after sign-in (and on
// SIGNED_IN / USER_UPDATED events) to populate roles, permissions and
// profile company in a single round-trip. Migrated in Wave C.2a.1.b so
// `auth-context.tsx` stops importing the Supabase browser client for
// role/profile reads.

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { getCompanyRepository, getProfileRepository, getRoleRepository } from "@/lib/providers/registry";
import { getPlatformMode } from "@/lib/platform";

export interface SessionBootstrap {
  roles: string[];
  permissions: string[];
  companyId: string | null;
  companyName: string | null;
}

/**
 * Diagnostic wrapper. `bootstrapSession` failing degrades the whole app to a
 * read-only shell (every action button is permission-gated), so the server
 * log must always say WHICH step failed, on WHICH platform, with WHICH
 * repository implementation — never a bare stack. No tokens, claims or
 * connection strings are logged.
 */
async function step<T>(name: string, impl: unknown, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(
      JSON.stringify({
        event: "session_bootstrap_failed",
        step: name,
        platformMode: getPlatformMode(),
        repository: (impl as { constructor?: { name?: string } })?.constructor?.name ?? typeof impl,
        errorName: err.name,
        errorMessage: err.message,
      }),
      err.stack,
    );
    throw err;
  }
}

export const bootstrapSession = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<SessionBootstrap> => {
    const roleRepo = await step("resolve_role_repository", null, async () =>
      getRoleRepository(context.supabase),
    );
    const profileRepo = await step("resolve_profile_repository", null, async () =>
      getProfileRepository(context.supabase),
    );

    const roles = await step("list_roles_for_user", roleRepo, () =>
      roleRepo.listRolesForUser(context.userId),
    );
    const profile = await step("find_profile_by_user_id", profileRepo, () =>
      profileRepo.findByUserId(context.userId),
    );

    // Permissions are derived per role so Cloud and Self-Hosted share one
    // code path (Cloud's repo delegates to the my_permissions RPC).
    const permSet = new Set<string>();
    await step("list_permissions_for_roles", roleRepo, async () => {
      await Promise.all(
        roles.map(async (r) => {
          const perms = await roleRepo.listPermissionsForRole(r);
          perms.forEach((p) => permSet.add(p));
        }),
      );
    });

    const companyId = profile?.companyId ?? null;
    const company = companyId
      ? await step("find_company_by_id", null, async () =>
          getCompanyRepository(context.supabase).findById(companyId),
        )
      : null;
    return {
      roles,
      permissions: [...permSet],
      companyId,
      companyName: company?.name ?? null,
    };
  });

