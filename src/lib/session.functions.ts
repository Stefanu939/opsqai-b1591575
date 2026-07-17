// Session bootstrap — the browser calls this once after sign-in (and on
// SIGNED_IN / USER_UPDATED events) to populate roles, permissions and
// profile company in a single round-trip. Migrated in Wave C.2a.1.b so
// `auth-context.tsx` stops importing the Supabase browser client for
// role/profile reads.

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { getProfileRepository, getRoleRepository } from "@/lib/providers/registry";

export interface SessionBootstrap {
  roles: string[];
  permissions: string[];
  companyId: string | null;
}

export const bootstrapSession = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<SessionBootstrap> => {
    const roleRepo = getRoleRepository(context.supabase);
    const profileRepo = getProfileRepository(context.supabase);

    const [roles, profile] = await Promise.all([
      roleRepo.listRolesForUser(context.userId),
      profileRepo.findByUserId(context.userId),
    ]);

    // Permissions: Cloud has a `my_permissions` RPC; on Self-Hosted the
    // role repository returns [] until role_permissions is modelled.
    // We derive from listPermissionsForRole so both platforms use the
    // same code path.
    const permSet = new Set<string>();
    await Promise.all(
      roles.map(async (r) => {
        const perms = await roleRepo.listPermissionsForRole(r);
        perms.forEach((p) => permSet.add(p));
      }),
    );

    return {
      roles,
      permissions: [...permSet],
      companyId: profile?.companyId ?? null,
    };
  });
