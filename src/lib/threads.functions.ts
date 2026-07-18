import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";

import { getActorRoles, getProfileCompany } from "@/lib/authorization";
import { getThreadRepository } from "@/lib/providers/registry";

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const optionalUiUuid = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return UUID_RE.test(trimmed) ? trimmed : undefined;
}, z.string().optional());

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { title?: string; companyId?: string | null }) =>
    z.object({ title: z.string().optional(), companyId: optionalUiUuid }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let companyId = await getProfileCompany(context.supabase, context.userId);
    if (data.companyId && data.companyId !== companyId) {
      const actor = await getActorRoles(context.supabase, context.userId);
      if (actor.isPlatformAdmin) companyId = data.companyId;
    }
    if (!companyId) throw new Error("No company assigned");
    return getThreadRepository(context.supabase).create({
      userId: context.userId,
      companyId,
      title: data.title ?? "New conversation",
    });
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await getThreadRepository(context.supabase).deleteOwned(data.id, context.userId);
    return { ok: true };
  });

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: { companyId?: string | null }) =>
    z.object({ companyId: optionalUiUuid }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    return getThreadRepository(context.supabase).listForUser(context.userId, {
      companyId: data.companyId ?? null,
      limit: 200,
    });
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string; title: string }) =>
    z.object({ id: z.string().uuid(), title: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await getThreadRepository(context.supabase).renameOwned(
      data.id,
      context.userId,
      data.title,
    );
    return { ok: true };
  });
