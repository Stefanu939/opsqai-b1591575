// Profile server functions.
//
// Thin wrappers around IProfileRepository + IStorageProvider so browser code
// (avatar uploader, profile forms) never touches a Cloud SDK directly. Works
// identically on Cloud (object storage) and Self-Hosted (local filesystem).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { getProfileRepository, getStorageProvider } from "@/lib/providers/registry";

const AVATAR_BUCKET = "avatars";

export const getMyAvatarPath = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<{ path: string | null }> => {
    const profile = await getProfileRepository(context.supabase).findByUserId(context.userId);
    return { path: profile?.avatarUrl ?? null };
  });

export const setMyAvatarPath = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data) => z.object({ path: z.string().min(1).max(512) }).parse(data))
  .handler(async ({ context, data }): Promise<{ path: string }> => {
    await getProfileRepository(context.supabase).updateByUserId(context.userId, {
      avatarUrl: data.path,
    });
    return { path: data.path };
  });

export const clearMyAvatarPath = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    await getProfileRepository(context.supabase).updateByUserId(context.userId, {
      avatarUrl: null,
    });
    return { ok: true };
  });

/**
 * Upload an avatar for the signed-in user through the active storage provider
 * and point `profiles.avatar_url` at the resulting key.
 */
export const uploadMyAvatarFile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        filename: z.string().min(1),
        content_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
        data_base64: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ path: string }> => {
    const ext =
      data.content_type === "image/png"
        ? "png"
        : data.content_type === "image/webp"
          ? "webp"
          : "jpg";
    const key = `${context.userId}/avatar-${Date.now()}.${ext}`;
    const binary = atob(data.data_base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    await getStorageProvider().put({
      bucket: AVATAR_BUCKET,
      key,
      body: bytes,
      contentType: data.content_type,
    });
    await getProfileRepository(context.supabase).updateByUserId(context.userId, {
      avatarUrl: key,
    });
    return { path: key };
  });

/**
 * Read an avatar object inline (base64) so the browser can render it as a
 * blob/data URL without any storage SDK.
 */
export const getAvatarBlob = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(512) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const bytes = await getStorageProvider().get(AVATAR_BUCKET, data.path);
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      const head = await getStorageProvider().head(AVATAR_BUCKET, data.path);
      return {
        data_base64: btoa(binary),
        content_type: head?.contentType ?? "image/jpeg",
      };
    } catch {
      return null;
    }
  });
