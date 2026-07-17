import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth.server";
import { createHash, randomBytes } from "crypto";

export type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

async function resolveCompanyId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.company_id) throw new Error("No company context for this user");
  return data.company_id as string;
}

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const companyId = await resolveCompanyId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, created_at, last_used_at, revoked_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { keys: (data ?? []) as ApiKeyRow[] };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: { name: string }) => {
    const name = (input?.name ?? "").trim();
    if (!name) throw new Error("Name is required");
    if (name.length > 80) throw new Error("Name too long");
    return { name };
  })
  .handler(async ({ data, context }) => {
    const companyId = await resolveCompanyId(context.supabase, context.userId);
    const raw = "opsq_live_" + randomBytes(24).toString("base64url");
    const prefix = raw.slice(0, 12);
    const hash = hashKey(raw);

    const { data: row, error } = await context.supabase
      .from("api_keys")
      .insert({
        company_id: companyId,
        name: data.name,
        key_prefix: prefix,
        key_hash: hash,
        created_by: context.userId,
      })
      .select("id, name, key_prefix, scopes, created_at, last_used_at, revoked_at")
      .single();
    if (error) throw new Error(error.message);

    // raw key returned ONCE — never stored, never returned again
    return { key: row as ApiKeyRow, secret: raw };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
