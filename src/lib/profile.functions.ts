// Profile server functions (Wave C.2a.1.b).
//
// Thin wrappers around IProfileRepository so browser code (avatar
// uploader, profile forms) never queries `profiles` directly.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { getProfileRepository } from "@/lib/providers/registry";

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
