// Self-Hosted installation hygiene: which company owns this installation,
// whether the active licence still matches, and how many platform owners exist.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";

export interface InstallationHygieneResult {
  selfHosted: boolean;
  bound: boolean;
  ownerCompany: string | null;
  installId: string | null;
  boundAt: string | null;
  licenseCompany: string | null;
  mismatch: boolean;
  ownerCount: number;
  owners: Array<{ id: string; email: string; createdAt: string | null }>;
}

const EMPTY: InstallationHygieneResult = {
  selfHosted: false,
  bound: false,
  ownerCompany: null,
  installId: null,
  boundAt: null,
  licenseCompany: null,
  mismatch: false,
  ownerCount: 0,
  owners: [],
};

/** Full report — platform admins only. */
export const getInstallationHygiene = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<InstallationHygieneResult> => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) return EMPTY;
    const { installationHygiene } = await import("@/lib/selfhost-tenant-binding.server");
    const report = await installationHygiene();
    return { selfHosted: true, ...report };
  });

/**
 * Startup safety check for every signed-in user: true when the licence on disk
 * no longer belongs to the company this installation's data belongs to.
 */
export const getInstallationLockState = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async (): Promise<{ locked: boolean; ownerCompany: string | null }> => {
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) return { locked: false, ownerCompany: null };
    const { readInstallationOwner, companyKey } = await import(
      "@/lib/selfhost-tenant-binding.server"
    );
    const owner = await readInstallationOwner();
    if (!owner) return { locked: false, ownerCompany: null };
    const { activeInstallLicense } = await import("@/lib/selfhost-license-activation.server");
    const active = await activeInstallLicense();
    // No licence on disk is handled by the existing licensing screens; only an
    // actively mismatched licence locks the installation.
    if (!active) return { locked: false, ownerCompany: owner.companyName };
    return {
      locked: companyKey(active) !== owner.companyKey,
      ownerCompany: owner.companyName,
    };
  });

/**
 * Downgrade an extra owner account to `admin`. Refuses to touch the caller's
 * own account and never leaves the installation without an owner.
 */
export const demoteInstallationOwner = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) throw new Error("Self-Hosted installations only");
    if (data.userId === context.userId) throw new Error("You cannot change your own owner role");

    const { installationHygiene } = await import("@/lib/selfhost-tenant-binding.server");
    const report = await installationHygiene();
    if (report.ownerCount <= 1) throw new Error("An installation must keep one owner");
    if (report.owners[0]?.id === data.userId) {
      throw new Error("The first owner of this installation cannot be changed here");
    }

    const { getRoleRepository } = await import("@/lib/providers/registry");
    const repo = getRoleRepository(context.supabase);
    await repo.removeRole(data.userId, "platform_owner");
    await repo.addRole(data.userId, "admin");
    return { ok: true };
  });
