// Management Center administration of Windows installer releases.
//
// `installer_releases` is the source of truth the Self-Hosted auto-updater
// asks about (see /api/public/v1/updates/check). GitHub builds are registered
// here automatically as metadata; publishing to the fleet stays an explicit
// human decision.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { getCloudSupabase } from "@/lib/providers/not-available";
import { uuidString } from "@/lib/zod-uuid";

export interface InstallerReleaseRow {
  id: string;
  version: string;
  tag_name: string | null;
  channel: string;
  notes: string | null;
  min_version: string | null;
  zip_url: string | null;
  zip_size_bytes: number | null;
  exe_sha256: string | null;
  exe_size_bytes: number | null;
  package_storage_path: string | null;
  is_published: boolean;
  is_active: boolean;
  published_at: string;
}

export const listInstallerReleases = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<InstallerReleaseRow[]> => {
    await requirePlatformAdmin(context);
    const { data, error } = await getCloudSupabase(context, "installer releases")
      .from("installer_releases")
      .select(
        "id, version, tag_name, channel, notes, min_version, zip_url, zip_size_bytes, exe_sha256, exe_size_bytes, package_storage_path, is_published, is_active, published_at",
      )
      .order("published_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as InstallerReleaseRow[];
  });

/** Pull the newest GitHub build in as an unpublished release. */
export const syncInstallerReleasesFromGithub = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<{ version: string | null }> => {
    await requirePlatformAdmin(context);
    const { syncLatestReleaseMetadata } = await import("@/lib/github-installer-release.server");
    const result = await syncLatestReleaseMetadata();
    return { version: result?.version ?? null };
  });

const SaveInput = z.object({
  id: uuidString().optional(),
  version: z.string().min(1).max(64),
  tag_name: z.string().max(120).optional().nullable(),
  channel: z.enum(["stable", "beta"]).default("stable"),
  notes: z.string().max(5000).optional().nullable(),
  min_version: z.string().max(64).optional().nullable(),
  zip_url: z.string().url().max(1000).optional().nullable(),
  exe_sha256: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, "SHA-256 must be 64 hex characters")
    .optional()
    .nullable(),
  package_storage_path: z.string().max(500).optional().nullable(),
  is_published: z.boolean().default(false),
});

export const saveInstallerRelease = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await requirePlatformAdmin(context);
    const db = getCloudSupabase(context, "installer releases");

    // A published release must be installable: the updater needs somewhere to
    // download from and a hash to verify the artifact against.
    if (data.is_published) {
      if (!data.zip_url && !data.package_storage_path) {
        throw new Error("Add a download URL or an uploaded package before publishing.");
      }
      if (!data.exe_sha256) {
        throw new Error("A SHA-256 checksum is required before publishing to installations.");
      }
    }

    const row = {
      version: data.version,
      tag_name: data.tag_name ?? undefined,
      channel: data.channel,
      notes: data.notes ?? null,
      min_version: data.min_version ?? null,
      zip_url: data.zip_url ?? undefined,
      exe_sha256: data.exe_sha256 ? data.exe_sha256.toLowerCase() : null,
      package_storage_path: data.package_storage_path ?? null,
      is_published: data.is_published,
    };

    let error: { message: string } | null = null;
    if (data.id) {
      ({ error } = await db.from("installer_releases").update(row).eq("id", data.id));
    } else {
      if (!row.zip_url) throw new Error("A download URL is required for a new release.");
      ({ error } = await db.from("installer_releases").upsert(
        { ...row, zip_url: row.zip_url, tag_name: row.tag_name ?? data.version },
        { onConflict: "version" },
      ));
    }
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setInstallerReleasePublished = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: uuidString(), is_published: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await requirePlatformAdmin(context);
    const db = getCloudSupabase(context, "installer releases");

    if (data.is_published) {
      const { data: row, error: readErr } = await db
        .from("installer_releases")
        .select("zip_url, package_storage_path, exe_sha256")
        .eq("id", data.id)
        .maybeSingle();
      if (readErr) throw new Error(readErr.message);
      if (!row) throw new Error("Release not found.");
      if (!row.zip_url && !row.package_storage_path) {
        throw new Error("Add a download URL or an uploaded package before publishing.");
      }
      if (!row.exe_sha256) {
        throw new Error("A SHA-256 checksum is required before publishing to installations.");
      }
    }

    const { error } = await db
      .from("installer_releases")
      .update({ is_published: data.is_published })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
