import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const optionalUiUuid = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return UUID_RE.test(trimmed) ? trimmed : undefined;
}, z.string().optional());

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title?: string; companyId?: string | null }) =>
    z.object({
      title: z.string().optional(),
      companyId: optionalUiUuid,
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("company_id").eq("id", context.userId).maybeSingle();

    // Platform admins may scope a thread to any workspace they're currently viewing.
    let companyId = profile?.company_id ?? null;
    if (data.companyId && data.companyId !== companyId) {
      const { data: roleRows } = await context.supabase
        .from("user_roles").select("role").eq("user_id", context.userId);
      const roles = (roleRows ?? []).map((r) => r.role as string);
      const isPlatform = roles.includes("platform_admin") || roles.includes("platform_owner");
      if (isPlatform) companyId = data.companyId;
    }
    if (!companyId) throw new Error("No company assigned");

    const { data: row, error } = await context.supabase
      .from("threads")
      .insert({ user_id: context.userId, company_id: companyId, title: data.title ?? "New conversation" })
      .select("id,title,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("threads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
