// OPSQAI HR — shared caller resolution (company scope + per-user HR rights).
// Server only: never import from client components.

import { getProfileRepository } from "@/lib/providers/registry";
import { HR_GRANTS, type HrGrantKey } from "@/lib/hr/types";

export type HrCtx = { supabase: unknown; userId: string; claims?: { email?: string } };

export interface HrActor {
  userId: string;
  companyId: string;
  name: string;
  grants: HrGrantKey[];
}

export async function hrActor(context: HrCtx): Promise<HrActor> {
  const profile = await getProfileRepository(context.supabase).findByUserId(context.userId);
  const companyId = profile?.companyId ?? null;
  if (!companyId) throw new Error("No workspace is linked to this account.");

  const { getActorRoles } = await import("@/lib/authorization");
  const roles = await getActorRoles(context.supabase, context.userId);
  const unrestricted =
    roles.isPlatformOwner ||
    roles.isPlatformAdmin ||
    roles.roles.includes("superadmin") ||
    roles.roles.includes("workspace_owner") ||
    roles.roles.includes("admin");

  const { getAreaRightsRepository, hasAreaRightsRepository } = await import(
    "@/lib/providers/registry"
  );
  const rights = hasAreaRightsRepository()
    ? await getAreaRightsRepository(context.supabase).listForUser(companyId, context.userId)
    : [];
  const mapped = rights
    .filter((r) => (r.areaKey === "hr" || r.areaKey === "hr_payroll") && r.granted)
    .flatMap((r): HrGrantKey[] => {
      if (r.areaKey === "hr_payroll") {
        switch (r.action) {
          case "view":
            return ["payroll"];
          case "edit":
            return ["payroll", "payroll_edit"];
          case "administer":
            return ["payroll", "payroll_edit", "export"];
          default:
            return [];
        }
      }
      switch (r.action) {
        case "view":
          return ["view"];
        case "create":
          return ["create"];
        case "edit":
          return ["edit"];
        case "delete":
          return ["delete"];
        case "approve":
          return ["approve"];
        case "administer":
          return ["settings", "export", "sensitive"];
        default:
          return [];
      }
    });

  const grants: HrGrantKey[] = unrestricted
    ? [...HR_GRANTS]
    : mapped.length
      ? Array.from(new Set<HrGrantKey>(["view", ...mapped]))
      : ["view"];


  return {
    userId: context.userId,
    companyId,
    name:
      (profile as { fullName?: string; email?: string } | null)?.fullName ||
      context.claims?.email ||
      "User",
    grants,
  };
}

export function hrNeed(a: HrActor, grant: HrGrantKey): void {
  if (!a.grants.includes(grant)) {
    throw new Error(`Forbidden: this account has no HR "${grant}" right.`);
  }
}
