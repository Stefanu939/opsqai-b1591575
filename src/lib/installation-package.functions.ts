import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
// Server functions for Phase 4.5 Part 2 — Installation Package Generation.
//
// Endpoints:
//   - generateInstallationPackage:  MC admin generates or regenerates the ZIP
//   - getInstallationPackageDownloadUrl:  re-mint 24h signed URL (audited)
//   - getMyInstallationPackageDownloadUrl: portal-scoped variant
//   - setOrderInstallerPin:         pin a specific installer version to a license
//   - updateTechnicalContactEmail:  edit tech contact (for notifications)

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { z } from "zod";

const InstallIdSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]{2,}$/, "lowercase, digits, dashes");

// ─── Generate ───────────────────────────────────────────────────────────

const GenerateInput = z.object({
  install_id: InstallIdSchema,
  installer_version: z.string().max(64).optional(),
  keep_previous_bundle_valid: z.boolean().default(false),
});

async function resolveLatestStableInstallerVersion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<string> {
  const { data } = await supabase
    .from("license_releases")
    .select("version")
    .eq("channel", "stable")
    .eq("is_current", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { version?: string } | null)?.version ?? "1.0.0";
}

export const generateInstallationPackage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);

    const supabaseAdmin = await getCloudSupabaseAdmin("installation-package");
    const { buildActivationBundle } = await import("@/lib/license-activation-core.server");
    const { assembleInstallationPackage } = await import("@/lib/installation-package.server");

    // Load the install-kind license (source of company_name + pin)
    const { data: lic, error: licErr } = await supabaseAdmin
      .from("licenses")
      .select(
        "install_id, company_name, kind, revoked, suspended, pinned_installer_version, technical_contact_email, contact_email",
      )
      .eq("install_id", data.install_id)
      .eq("kind", "install")
      .maybeSingle();
    if (licErr) throw new Error(licErr.message);
    if (!lic) throw new Error("install_not_found");
    if (lic.revoked) throw new Error("install_revoked");

    // Resolve installer_version (arg > pinned > latest stable)
    const installerVersion =
      data.installer_version?.trim() ||
      (lic as { pinned_installer_version?: string }).pinned_installer_version ||
      (await resolveLatestStableInstallerVersion(supabaseAdmin));

    // Build signed activation bundle
    const bundle = await buildActivationBundle(data.install_id);

    // Assemble ZIP
    const { bytes, checksum_sha256, file_name } = await assembleInstallationPackage({
      install_id: data.install_id,
      installer_version: installerVersion,
      company_name: lic.company_name,
      bundle,
      license_server_url:
        process.env.OPSQAI_LICENSE_SERVER_URL ?? process.env.SUPABASE_URL ?? "https://opsqai.de",
    });

    // Upload
    const storagePath = `${data.install_id}/${file_name}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("installation-packages")
      .upload(storagePath, bytes, {
        contentType: "application/zip",
        upsert: true,
      });
    if (upErr) throw new Error(`upload_failed:${upErr.message}`);

    // Update license_installs (upsert)
    const { data: existing } = await supabaseAdmin
      .from("license_installs")
      .select("package_generation_count")
      .eq("install_id", data.install_id)
      .maybeSingle();
    const nextCount = ((existing?.package_generation_count as number | null) ?? 0) + 1;

    const now = new Date().toISOString();
    const patch = {
      install_id: data.install_id,
      package_generated_at: now,
      package_generation_count: nextCount,
      package_storage_path: storagePath,
      package_checksum_sha256: checksum_sha256,
      package_installer_version: installerVersion,
      previous_bundle_revoked_at:
        !data.keep_previous_bundle_valid && nextCount > 1 ? now : (null as string | null),
    };

    if (existing) {
      await supabaseAdmin.from("license_installs").update(patch).eq("install_id", data.install_id);
    } else {
      await supabaseAdmin.from("license_installs").insert(patch);
    }

    // Audit
    await supabaseAdmin.from("audit_log").insert({
      action: "installation_package.generated",
      entity_type: "install",
      entity_id: data.install_id,
      user_id: context.userId,
      metadata: {
        installer_version: installerVersion,
        checksum_sha256,
        generation_count: nextCount,
        previous_bundle_revoked: !data.keep_previous_bundle_valid && nextCount > 1,
      },
    } as never);

    // Sign a short URL to return to the caller (24h)
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("installation-packages")
      .createSignedUrl(storagePath, 24 * 60 * 60, { download: file_name });
    if (signErr || !signed?.signedUrl)
      throw new Error(`sign_failed:${signErr?.message ?? "unknown"}`);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin.from("installation_package_downloads").insert({
      install_id: data.install_id,
      actor_user_id: context.userId,
      actor_role: "platform_admin",
      signed_url_expires_at: expiresAt,
      storage_path: storagePath,
    });

    // Send email to technical contact (best-effort — never fail the whole call)
    const recipient =
      (lic as { technical_contact_email?: string | null }).technical_contact_email ||
      lic.contact_email ||
      null;
    if (recipient) {
      try {
        const { dispatchTransactionalEmail } = await import("@/lib/email/dispatch.server");
        await dispatchTransactionalEmail({
          templateName: "installation-package-ready",
          recipientEmail: recipient,
          templateData: {
            company_name: lic.company_name,
            install_id: data.install_id,
            installer_version: installerVersion,
            downloadUrl: signed.signedUrl,
            expiresAt: "in 24 hours",
            regenerated: nextCount > 1,
          },
        });
      } catch (e) {
        // swallow — the package was generated; email failure is not fatal
        console.warn("installation_package_email_failed", (e as Error).message);
      }
    }

    return {
      ok: true,
      install_id: data.install_id,
      installer_version: installerVersion,
      generation_count: nextCount,
      checksum_sha256,
      signed_url: signed.signedUrl,
      expires_at: expiresAt,
      previous_bundle_revoked: !data.keep_previous_bundle_valid && nextCount > 1,
    };
  });

// ─── Re-mint download URL (admin) ───────────────────────────────────────

export const getInstallationPackageDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ install_id: InstallIdSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("installation-package");

    const { data: inst } = await supabaseAdmin
      .from("license_installs")
      .select("package_storage_path")
      .eq("install_id", data.install_id)
      .maybeSingle();
    const path = (inst as { package_storage_path?: string } | null)?.package_storage_path;
    if (!path) throw new Error("package_not_generated");

    const { data: signed, error } = await supabaseAdmin.storage
      .from("installation-packages")
      .createSignedUrl(path, 24 * 60 * 60, { download: path.split("/").pop() });
    if (error || !signed?.signedUrl) throw new Error(`sign_failed:${error?.message ?? "unknown"}`);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin.from("installation_package_downloads").insert({
      install_id: data.install_id,
      actor_user_id: context.userId,
      actor_role: "platform_admin",
      signed_url_expires_at: expiresAt,
      storage_path: path,
    });

    return { signed_url: signed.signedUrl, expires_at: expiresAt };
  });

// ─── Re-mint download URL (customer portal, own installs only) ──────────

export const getMyInstallationPackageDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ install_id: InstallIdSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    if (!email) throw new Error("unauthenticated");

    const supabaseAdmin = await getCloudSupabaseAdmin("installation-package");
    const { data: lic } = await supabaseAdmin
      .from("licenses")
      .select("install_id")
      .eq("install_id", data.install_id)
      .eq("kind", "install")
      .eq("contact_email", email)
      .maybeSingle();
    if (!lic) throw new Error("forbidden");

    const { data: inst } = await supabaseAdmin
      .from("license_installs")
      .select("package_storage_path")
      .eq("install_id", data.install_id)
      .maybeSingle();
    const path = (inst as { package_storage_path?: string } | null)?.package_storage_path;
    if (!path) throw new Error("package_not_generated");

    const { data: signed, error } = await supabaseAdmin.storage
      .from("installation-packages")
      .createSignedUrl(path, 24 * 60 * 60, { download: path.split("/").pop() });
    if (error || !signed?.signedUrl) throw new Error(`sign_failed:${error?.message ?? "unknown"}`);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin.from("installation_package_downloads").insert({
      install_id: data.install_id,
      actor_user_id: context.userId,
      actor_email: email,
      actor_role: "customer",
      signed_url_expires_at: expiresAt,
      storage_path: path,
    });

    return { signed_url: signed.signedUrl, expires_at: expiresAt };
  });

// ─── Metadata read (admin) ──────────────────────────────────────────────

export const getInstallationPackageStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ install_id: InstallIdSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("installation-package");

    const [instRes, licRes, dlRes] = await Promise.all([
      supabaseAdmin
        .from("license_installs")
        .select(
          "install_id, package_generated_at, package_generation_count, package_installer_version, package_checksum_sha256, previous_bundle_revoked_at, installer_version, last_heartbeat_at",
        )
        .eq("install_id", data.install_id)
        .maybeSingle(),
      supabaseAdmin
        .from("licenses")
        .select(
          "install_id, company_name, pinned_installer_version, technical_contact_email, contact_email",
        )
        .eq("install_id", data.install_id)
        .eq("kind", "install")
        .maybeSingle(),
      supabaseAdmin
        .from("installation_package_downloads")
        .select("id, actor_email, actor_role, signed_url_expires_at, created_at")
        .eq("install_id", data.install_id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      install: instRes.data ?? null,
      license: licRes.data ?? null,
      recent_downloads: dlRes.data ?? [],
    };
  });

// ─── Pin installer version ──────────────────────────────────────────────

export const setInstallerPin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        install_id: InstallIdSchema,
        pinned_installer_version: z.string().max(64).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("installation-package");
    const { error } = await supabaseAdmin
      .from("licenses")
      .update({ pinned_installer_version: data.pinned_installer_version })
      .eq("install_id", data.install_id)
      .eq("kind", "install");
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_log").insert({
      action: "installation_package.pin_updated",
      entity_type: "install",
      entity_id: data.install_id,
      user_id: context.userId,
      metadata: { pinned: data.pinned_installer_version },
    } as never);
    return { ok: true };
  });

// ─── Update technical contact email ─────────────────────────────────────

export const setTechnicalContactEmail = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        install_id: InstallIdSchema,
        technical_contact_email: z.string().email().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("installation-package");
    const { error } = await supabaseAdmin
      .from("licenses")
      .update({ technical_contact_email: data.technical_contact_email })
      .eq("install_id", data.install_id)
      .eq("kind", "install");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
