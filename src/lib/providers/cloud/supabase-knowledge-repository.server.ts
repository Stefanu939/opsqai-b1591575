// Cloud IKnowledgeRepository — backed by public.knowledge_documents and
// public.document_chunks via the user-scoped Supabase client (RLS applies).
// Vector similarity search delegates to the SQL RPC `match_knowledge_chunks`.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  IKnowledgeRepository,
  KnowledgeChunkContentRow,
  KnowledgeChunkInsert,
  KnowledgeDocumentInsert,
  KnowledgeDocumentRow,
  KnowledgeMatch,
  KnowledgeVersionAnchor,
  KnowledgeVersionInsert,
} from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

export function createSupabaseKnowledgeRepository(client: Client): IKnowledgeRepository {
  return {
    async listDocuments(companyId, includeInactive) {
      let q = client
        .from("knowledge_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (!includeInactive) q = q.eq("is_active", true);
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as KnowledgeDocumentRow[];
    },

    async listVersions(rootId) {
      const { data, error } = await client
        .from("knowledge_documents")
        .select("*")
        .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`)
        .order("version", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as KnowledgeDocumentRow[];
    },

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
      const { data, error } = await (client.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{
        data: Array<{ document_id: string; chunk_index: number; content: string; similarity: number }> | null;
        error: { message: string } | null;
      }>)("match_document_chunks_for_company", {
        query_embedding: toVectorLiteral(query_embedding),
        match_count: limit,
        min_similarity: 0.12,
        _company_id: company_id,
      });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => ({
        document_id: row.document_id,
        chunk_index: row.chunk_index,
        content: row.content,
        similarity: Number(row.similarity ?? 0),
      }));
    },

    async getDocumentsByIds(ids) {
      if (ids.length === 0) return [];
      const { data, error } = await client
        .from("knowledge_documents")
        .select("id, title, doc_code, version, section, page, department_id, updated_at")
        .in("id", ids);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => ({
        id: row.id, title: row.title, docCode: row.doc_code, version: row.version,
        section: row.section, page: row.page, departmentId: row.department_id,
        updatedAt: row.updated_at,
      }));
    },

    async getChunksContent(documentId, limit) {
      const { data, error } = await client
        .from("document_chunks")
        .select("content")
        .eq("document_id", documentId)
        .order("chunk_index", { ascending: true })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => row.content as string);
    },

    async getChunksForDocuments(documentIds, limit): Promise<KnowledgeChunkContentRow[]> {
      if (documentIds.length === 0) return [];
      const { data, error } = await client
        .from("document_chunks")
        .select("document_id, chunk_index, content")
        .in("document_id", documentIds)
        .order("chunk_index", { ascending: true })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as KnowledgeChunkContentRow[];
    },

    async getVersionAnchor(id) {
      const { data, error } = await client
        .from("knowledge_documents")
        .select("id, company_id, doc_code, version, parent_document_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as never) ?? null;
    },

    async markReplaced(id) {
      const { error } = await client
        .from("knowledge_documents")
        .update({ is_active: false, replaced_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async insertVersion(input: KnowledgeVersionInsert) {
      const { data, error } = await client
        .from("knowledge_documents")
        .insert({
          company_id: input.company_id,
          title: input.title,
          category: input.category,
          doc_code: input.doc_code ?? null,
          file_path: input.file_path,
          file_type: input.file_type,
          content_text: "",
          status: "processing",
          uploaded_by: input.uploaded_by ?? null,
          version: input.version,
          is_active: true,
          parent_document_id: input.parent_document_id,
          change_notes: input.change_notes ?? null,
        } as never)
        .select("id, company_id")
        .single();
      if (error || !data) throw new Error(error?.message || "Insert failed");
      return data as { id: string; company_id: string };
    },

    async deactivateLineage(company_id, doc_code) {
      let q = client
        .from("knowledge_documents")
        .update({ is_active: false } as never)
        .eq("company_id", company_id);
      q = doc_code === null ? q.is("doc_code", null) : q.eq("doc_code", doc_code);
      const { error } = await q;
      if (error) throw new Error(error.message);
    },

    async activateDocument(id) {
      const { error } = await client
        .from("knowledge_documents")
        .update({ is_active: true, replaced_at: null } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },

    async setCritical(id, is_critical) {
      const { error } = await client
        .from("knowledge_documents")
        .update({ is_critical } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}

export const supabaseKnowledgeRepositoryFactory =
  (dataCtx: unknown): IKnowledgeRepository =>
    createSupabaseKnowledgeRepository(dataCtx as Client);
