// Cloud IKnowledgeGapRepository — uses the `match_knowledge_gap` RPC
// (pgvector-based semantic dedup) with a normalized-text fallback.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  IKnowledgeGapRepository,
  KnowledgeGapListRow,
} from "@/lib/providers/interfaces";

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

    async list(companyId, limit) {
      const { data, error } = await client
        .from("knowledge_gaps")
        .select(
          "id, question_sample, question_normalized, occurrences, first_seen, last_seen, status, assignee_id, resolution, resolved_document_id, resolved_faq_id, department_id, created_by, confidence, source_thread_id, source_message_id, resolution_date, updated_at",
        )
        .eq("company_id", companyId)
        .order("last_seen", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      const gaps = (data ?? []) as unknown as KnowledgeGapListRow[];
      const ids = (key: keyof KnowledgeGapListRow) =>
        Array.from(new Set(gaps.map((g) => g[key]).filter(Boolean) as string[]));
      const deptIds = ids("department_id");
      const userIds = ids("created_by");
      const docIds = ids("resolved_document_id");
      const faqIds = ids("resolved_faq_id");

      const [depts, users, docs, faqs] = await Promise.all([
        deptIds.length
          ? client.from("departments").select("id, name").in("id", deptIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        userIds.length
          ? client.from("profiles").select("id, full_name").in("id", userIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
        docIds.length
          ? client.from("knowledge_documents").select("id, title, doc_code").in("id", docIds)
          : Promise.resolve({ data: [] as { id: string; title: string; doc_code: string | null }[] }),
        faqIds.length
          ? client.from("faqs").select("id, question_en").in("id", faqIds)
          : Promise.resolve({ data: [] as { id: string; question_en: string | null }[] }),
      ]);
      const deptMap = new Map((depts.data ?? []).map((d) => [d.id, d.name]));
      const userMap = new Map((users.data ?? []).map((u) => [u.id, u.full_name]));
      const docMap = new Map((docs.data ?? []).map((d) => [d.id, d]));
      const faqMap = new Map((faqs.data ?? []).map((f) => [f.id, f]));

      return gaps.map((g) => ({
        ...g,
        department_name: g.department_id ? (deptMap.get(g.department_id) ?? null) : null,
        created_by_name: g.created_by ? (userMap.get(g.created_by) ?? null) : null,
        resolved_document: g.resolved_document_id
          ? (docMap.get(g.resolved_document_id) ?? null)
          : null,
        resolved_faq: g.resolved_faq_id ? (faqMap.get(g.resolved_faq_id) ?? null) : null,
      }));
    },

    async update(companyId, id, patch) {
      const { error } = await client
        .from("knowledge_gaps")
        .update(patch as never)
        .eq("company_id", companyId)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async remove(companyId, id) {
      const { error } = await client
        .from("knowledge_gaps")
        .delete()
        .eq("company_id", companyId)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}
