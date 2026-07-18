// Portal Admin server functions — news announcements + downloadable modules.
// Only platform_owner / platform_admin may create/update/deletimport { getCloudSupabase } from "@/lib/providers/not-available";
e.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";

const STAFF_ROLES = ["platform_owner", "platform_admin"] as const;

async function assertStaff(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", STAFF_ROLES);
  if (error) throw new Error("Role check failed");
  if (!data || (data as unknown[]).length === 0) {
    throw new Error("Forbidden: platform staff only");
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `post-${Math.random().toString(36).slice(2, 8)}`;
}

// ============= Announcements =============

export type PortalAnnouncement = {
  id: string;
  title: string;
  slug: string;
  body_md: string;
  cover_image_url: string | null;
  status: "draft" | "published";
  pinned: boolean;
  published_at: string | null;
  expires_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

export const listAnnouncementsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<PortalAnnouncement[]> => {
    await assertStaff(getCloudSupabase(context, "portal-admin") as never, context.userId);
    const { data, error } = await getCloudSupabase(context, "portal-admin")
      .from("portal_announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PortalAnnouncement[];
  });

export const listAnnouncementsPublic = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<PortalAnnouncement[]> => {
    const { data, error } = await getCloudSupabase(context, "portal-admin")
      .from("portal_announcements")
      .select("*")
      .eq("status", "published")
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as PortalAnnouncement[];
  });

export const getAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { slug?: string; id?: string }) =>
    z.object({ slug: z.string().optional(), id: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<PortalAnnouncement | null> => {
    const q = getCloudSupabase(context, "portal-admin").from("portal_announcements").select("*");
    const { data: row, error } = data.id
      ? await q.eq("id", data.id).maybeSingle()
      : await q.eq("slug", data.slug ?? "").maybeSingle();
    if (error) throw error;
    return (row ?? null) as PortalAnnouncement | null;
  });

const AnnouncementInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  slug: z.string().max(120).optional(),
  body_md: z.string().default(""),
  cover_image_url: z.string().max(2000).nullable().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
  pinned: z.boolean().default(false),
  published_at: z.string().datetime().nullable().optional(),
});

export const upsertAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => AnnouncementInput.parse(d))
  .handler(async ({ data, context }): Promise<PortalAnnouncement> => {
    await assertStaff(getCloudSupabase(context, "portal-admin") as never, context.userId);
    const slug = data.slug && data.slug.length > 0 ? slugify(data.slug) : slugify(data.title);
    const published_at =
      data.status === "published" && !data.published_at
        ? new Date().toISOString()
        : data.published_at ?? null;

    const payload = {
      title: data.title,
      slug,
      body_md: data.body_md,
      cover_image_url: data.cover_image_url ?? null,
      status: data.status,
      pinned: data.pinned,
      published_at,
      author_id: context.userId,
    };

    if (data.id) {
      const { data: row, error } = await getCloudSupabase(context, "portal-admin")
        .from("portal_announcements")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return row as PortalAnnouncement;
    }

    const { data: row, error } = await getCloudSupabase(context, "portal-admin")
      .from("portal_announcements")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return row as PortalAnnouncement;
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(getCloudSupabase(context, "portal-admin") as never, context.userId);
    const { error } = await getCloudSupabase(context, "portal-admin")
      .from("portal_announcements")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============= Download modules =============

export type PortalDownloadModule = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  version: string | null;
  file_url: string;
  file_size_bytes: number | null;
  checksum: string | null;
  icon_name: string | null;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export const listDownloadModulesAdmin = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<PortalDownloadModule[]> => {
    await assertStaff(getCloudSupabase(context, "portal-admin") as never, context.userId);
    const { data, error } = await getCloudSupabase(context, "portal-admin")
      .from("portal_download_modules")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PortalDownloadModule[];
  });

export const listDownloadModulesPublic = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<PortalDownloadModule[]> => {
    const { data, error } = await getCloudSupabase(context, "portal-admin")
      .from("portal_download_modules")
      .select("*")
      .eq("status", "published")
      .order("category", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PortalDownloadModule[];
  });

const ModuleInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().min(1).max(60).default("general"),
  version: z.string().max(60).nullable().optional(),
  file_url: z.string().min(1).max(4000),
  file_size_bytes: z.number().int().nonnegative().nullable().optional(),
  checksum: z.string().max(200).nullable().optional(),
  icon_name: z.string().max(60).nullable().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const upsertDownloadModule = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ModuleInput.parse(d))
  .handler(async ({ data, context }): Promise<PortalDownloadModule> => {
    await assertStaff(getCloudSupabase(context, "portal-admin") as never, context.userId);
    const published_at =
      data.status === "published" ? new Date().toISOString() : null;

    const payload = {
      title: data.title,
      description: data.description ?? null,
      category: data.category,
      version: data.version ?? null,
      file_url: data.file_url,
      file_size_bytes: data.file_size_bytes ?? null,
      checksum: data.checksum ?? null,
      icon_name: data.icon_name ?? null,
      status: data.status,
      published_at,
      author_id: context.userId,
    };

    if (data.id) {
      const { data: row, error } = await getCloudSupabase(context, "portal-admin")
        .from("portal_download_modules")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return row as PortalDownloadModule;
    }
    const { data: row, error } = await getCloudSupabase(context, "portal-admin")
      .from("portal_download_modules")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return row as PortalDownloadModule;
  });

export const deleteDownloadModule = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(getCloudSupabase(context, "portal-admin") as never, context.userId);
    const { error } = await getCloudSupabase(context, "portal-admin")
      .from("portal_download_modules")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Sign a storage path for download/preview (private buckets).
export const signPortalStoragePath = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { bucket: string; path: string; expiresIn?: number }) =>
    z
      .object({
        bucket: z.enum(["portal-news-images", "portal-download-modules"]),
        path: z.string().min(1),
        expiresIn: z.number().int().positive().max(60 * 60 * 24).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await getCloudSupabase(context, "portal-admin").storage
      .from(data.bucket)
      .createSignedUrl(data.path, data.expiresIn ?? 3600);
    if (error) throw error;
    return { url: signed.signedUrl };
  });
