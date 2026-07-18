// Cloud IKnowledgeRepository — backed by public.knowledge_documents and
// public.document_chunks via the user-scoped Supabase client (RLS applies).
// Vector similarity search delegates to the SQL RPC `match_knowledge_chunks`.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  IKnowledgeRepository,
  KnowledgeChunkInsert,
  KnowledgeDocumentInsert,
  KnowledgeMatch,
} from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

export function createSupabaseKnowledgeRepository(client: Client): IKnowledgeRepository {
  return {
    async insertDocument(input: KnowledgeDocumentInsert) {
      const { data, error } = await client
        .from("knowledge_documents")
        .insert({
          title: input.title,
          category: input.category,
          doc_code: input.doc_code ?? null,
          file_path: input.file_path,
          file_type: input.file_type,
          content_text: "",
          status: "processing",
          uploaded_by: input.uploaded_by ?? null,
          company_id: input.company_id,
        } as never)
        .select("id, company_id")
        .single();
      if (error || !data) throw new Error(error?.message || "Insert failed");
      return data as { id: string; company_id: string };
    },

    async getForProcessing(id) {
      const { data, error } = await client
        .from("knowledge_documents")
        .select("id, company_id, file_path, file_type, title")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as never) ?? null;
    },

    async markProcessing(id) {
      const { error } = await client
        .from("knowledge_documents")
        .update({ status: "processing", error: null, chunk_count: 0 } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async markReady(id, chunk_count, content_preview) {
      const { error } = await client
        .from("knowledge_documents")
        .update({
          status: "ready",
          chunk_count,
          content_text: content_preview,
          error: null,
        } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async markFailed(id, message) {
      const { error } = await client
        .from("knowledge_documents")
        .update({ status: "failed", error: message } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async deleteChunks(document_id) {
      const { error } = await client
        .from("document_chunks")
        .delete()
        .eq("document_id", document_id);
      if (error) throw new Error(error.message);
    },

    async insertChunks(rows: KnowledgeChunkInsert[]) {
      if (rows.length === 0) return;
      const payload = rows.map((r) => ({
        document_id: r.document_id,
        company_id: r.company_id,
        chunk_index: r.chunk_index,
        content: r.content,
        token_count: r.token_count,
        embedding: toVectorLiteral(r.embedding),
      }));
      const { error } = await client.from("document_chunks").insert(payload as never);
      if (error) throw new Error(error.message);
    },

    async getFilePath(id) {
      const { data, error } = await client
        .from("knowledge_documents")
        .select("file_path")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data?.file_path as string | null) ?? null;
    },

    async deleteDocument(id) {
      const { error } = await client.from("knowledge_documents").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async searchSimilar(company_id, query_embedding, limit): Promise<KnowledgeMatch[]> {
      // Match RPC signature; if the RPC isn't deployed in a given environment
      // we surface the provider error rather than silently returning [].
      const { data, error } = await (client.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: KnowledgeMatch[] | null; error: { message: string } | null }>)(
        "match_knowledge_chunks",
        {
          p_company_id: company_id,
          p_query: toVectorLiteral(query_embedding),
          p_limit: limit,
        },
      );
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  };
}

export const supabaseKnowledgeRepositoryFactory =
  (dataCtx: unknown): IKnowledgeRepository =>
    createSupabaseKnowledgeRepository(dataCtx as Client);
