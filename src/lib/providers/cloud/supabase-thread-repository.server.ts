// Cloud IThreadRepository — wraps public.threads under user-scoped RLS.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { IThreadRepository } from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

export function createSupabaseThreadRepository(client: Client): IThreadRepository {
  return {
    async create({ userId, companyId, title }) {
      const { data, error } = await client
        .from("threads")
        .insert({ user_id: userId, company_id: companyId, title })
        .select("id,title,created_at,updated_at")
        .single();
      if (error) throw new Error(error.message);
      return {
        id: data.id,
        title: data.title,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    },
    async deleteOwned(id, userId) {
      const { error } = await client
        .from("threads")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    async listForUser(userId, opts) {
      let q = client
        .from("threads")
        .select("id,title,created_at,updated_at,company_id")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(opts?.limit ?? 200);
      if (opts?.companyId) q = q.eq("company_id", opts.companyId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        companyId: r.company_id,
      }));
    },
    async renameOwned(id, userId, title) {
      const { error } = await client
        .from("threads")
        .update({ title })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
  };
}
