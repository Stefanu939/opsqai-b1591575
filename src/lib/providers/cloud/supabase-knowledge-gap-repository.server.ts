// Cloud IKnowledgeGapRepository — uses the `match_knowledge_gap` RPC
// (pgvector-based semantic dedup) with a normalized-text fallback.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { IKnowledgeGapRepository } from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

export function createSupabaseKnowledgeGapRepository(
  client: Client,
): IKnowledgeGapRepository {
  return {
    async matchExisting(companyId, questionNormalized) {
      // Try semantic-dedup RPC first.
      const { data: matched } = (await client.rpc("match_knowledge_gap" as never, {
        _company_id: companyId,
        _question: questionNormalized,
        _question_normalized: questionNormalized,
        _embedding: null,
        _threshold: 0.82,
      } as never)) as { data: string | null };
      return matched ?? null;
    },
    async incrementOccurrence(id) {
      const { data: cur } = await client
        .from("knowledge_gaps")
        .select("occurrences")
        .eq("id", id)
        .maybeSingle();
      const occ = (cur?.occurrences ?? 1) + 1;
      await client
        .from("knowledge_gaps")
        .update({ occurrences: occ, last_seen: new Date().toISOString(), status: "open" })
        .eq("id", id)
        .in("status", ["open", "in_progress"]);
    },
    async create(input) {
      const { data, error } = await client
        .from("knowledge_gaps")
        .insert({
          company_id: input.companyId,
          question_normalized: input.questionNormalized,
          question_sample: input.questionSample,
          department_id: input.departmentId,
          created_by: input.createdBy,
          confidence: input.confidence,
          source_thread_id: input.sourceThreadId,
          source_message_id: input.sourceMessageId,
          status: "open",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id };
    },
  };
}
