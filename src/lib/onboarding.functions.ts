// Composed onboarding server function — issues an Installation License,
// optional Module Licenses, then generates the installation package.
// Idempotent: re-running for the same install_id skips licenses already
// issued, so a half-finished onboarding can be safely retried. The company's
// onboarding_status records where it stopped.

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { z } from "zod";
import { isValidModuleKey } from "@/lib/license-modules";
import { getCloudSupabase } from "@/lib/providers/not-available";

const InstallIdSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]{2,}$/, "lowercase, digits, dashes");

const OnboardInput = z.object({
  install_id: InstallIdSchema,
  company_name: z.string().min(1).max(200),
  contact_email: z.string().email(),
  technical_contact_email: z.string().email().optional().nullable(),
  tier: z.enum(["basic", "standard", "business", "enterprise"]).default("basic"),
  seats: z.number().int().positive().default(5),
  expires_at: z.string().datetime().nullable().optional(),
  modules: z.array(z.string().refine(isValidModuleKey, "unknown module")).default([]),
  notes: z.string().max(2000).optional(),
  send_email: z.boolean().default(true),
});

export type OnboardResult = {
  ok: boolean;
  install_id: string;
  license_issued: boolean;
  modules_issued: string[];
  modules_failed: Array<{ module: string; error: string }>;
  package_generated: boolean;
  package_error?: string;
  signed_url?: string;
  expires_at?: string;
  installer_version?: string;
};

export const onboardCustomer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => OnboardInput.parse(d))
  .handler(async ({ data, context }): Promise<OnboardResult> => {
    await requirePlatformAdmin(context);

    const { issueLicense, issueModuleLicense } = await import("@/lib/licenses.functions");
    const { generateInstallationPackage } = await import(
      "@/lib/installation-package.functions"
    );
    const supabaseAdmin = getCloudSupabase(context, "onboarding");

    const markCompany = async (status: string, err: string | null) => {
      await supabaseAdmin
        .from("companies")
        .update({ onboarding_status: status, onboarding_error: err })
        .eq("install_id", data.install_id);
    };
    const { data: existingLic } = await supabaseAdmin
      .from("licenses")
      .select("kind, module_key")
      .eq("install_id", data.install_id);
    const hasInstall = (existingLic ?? []).some((l) => l.kind === "install");
    const existingModules = new Set(
      (existingLic ?? []).filter((l) => l.kind === "module").map((l) => l.module_key as string),
    );

    // Step 1 — install license (skipped when already issued on a previous attempt)
    if (!hasInstall) try { await (issueLicense as unknown as (args: { data: unknown }) => Promise<unknown>)({
      data: {
        install_id: data.install_id,
        company_name: data.company_name,
        contact_email: data.contact_email,
        tier: data.tier,
        seats: data.seats,
        expires_at: data.expires_at ?? null,
        maintenance_expires_at: data.expires_at ?? null,
        notes: data.notes,
      },
    }); } catch (e) {
      await markCompany("license_failed", (e as Error).message);
      throw new Error(`Firma a fost salvată, dar licența nu s-a emis: ${(e as Error).message}. Apasă din nou „Creează” — procesul continuă de unde a rămas.`);
    }

    // Persist technical contact if provided (used by installation-package email)
    if (data.technical_contact_email) {
      await supabaseAdmin
        .from("licenses")
        .update({ technical_contact_email: data.technical_contact_email })
        .eq("install_id", data.install_id)
        .eq("kind", "install");
    }

    // Step 2 — module licenses (best-effort per module)
    const modules_issued: string[] = [];
    const modules_failed: Array<{ module: string; error: string }> = [];
    for (const module_key of data.modules) {
      if (existingModules.has(module_key)) {
        modules_issued.push(module_key);
        continue;
      }
      try {
        await (
          issueModuleLicense as unknown as (args: { data: unknown }) => Promise<unknown>
        )({
          data: {
            install_id: data.install_id,
            module_key,
            expires_at: data.expires_at ?? null,
            maintenance_expires_at: data.expires_at ?? null,
            unit_price_cents: 0,
          },
        });
        modules_issued.push(module_key);
      } catch (e) {
        modules_failed.push({ module: module_key, error: (e as Error).message });
      }
    }

    // Step 3 — generate installation package (do NOT throw on failure)
    let package_generated = false;
    let package_error: string | undefined;
    let signed_url: string | undefined;
    let expires_at: string | undefined;
    let installer_version: string | undefined;
    try {
      const pkg = (await (
        generateInstallationPackage as unknown as (args: {
          data: unknown;
        }) => Promise<{
          signed_url: string;
          expires_at: string;
          installer_version: string;
        }>
      )({
        data: {
          install_id: data.install_id,
          keep_previous_bundle_valid: false,
        },
      })) as {
        signed_url: string;
        expires_at: string;
        installer_version: string;
      };
      package_generated = true;
      signed_url = pkg.signed_url;
      expires_at = pkg.expires_at;
      installer_version = pkg.installer_version;
    } catch (e) {
      package_error = (e as Error).message;
    }

    await markCompany(
      package_generated ? "completed" : "package_failed",
      package_generated ? null : (package_error ?? null),
    );

    // Audit onboarding event
    await supabaseAdmin.from("audit_log").insert({
      action: "onboarding.completed",
      entity_type: "install",
      entity_id: data.install_id,
      user_id: context.userId,
      metadata: {
        company_name: data.company_name,
        tier: data.tier,
        seats: data.seats,
        modules_issued,
        modules_failed,
        package_generated,
      },
    } as never);

    return {
      ok: true,
      install_id: data.install_id,
      license_issued: true,
      modules_issued,
      modules_failed,
      package_generated,
      package_error,
      signed_url,
      expires_at,
      installer_version,
    };
  });
