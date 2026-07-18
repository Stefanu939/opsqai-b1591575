// Cloud IFaqRepository — backed by public.faqs via user-scoped Supabase client
// so RLS still applies. `dataCtx` is the SupabaseClient injected by
// requireAuth's cloud data-context.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { FaqRow, FaqUpsertInput, IFaqRepository } from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

export function createSupabaseFaqRepository(client: Client): IFaqRepository {
  return {
    async update(id, patch) {
      const { error } = await client.from("faqs").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    async getMetaById(id) {
      const { data, error } = await client
        .from("faqs")
        .select("company_id, category, question_en")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Pick<FaqRow, "company_id" | "category" | "question_en"> | null) ?? null;
    },
    async insert(companyId, input) {
      const { data, error } = await client
        .from("faqs")
        .insert({ ...input, company_id: companyId } as never)
        .select("id, category, question_en")
        .single();
      if (error) throw new Error(error.message);
      return data as Pick<FaqRow, "id" | "category" | "question_en">;
    },
    async delete(id) {
      const { error } = await client.from("faqs").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}

export const supabaseFaqRepositoryFactory =
  (dataCtx: unknown): IFaqRepository =>
    createSupabaseFaqRepository(dataCtx as Client);
