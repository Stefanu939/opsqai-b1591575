// Self-Hosted IKnowledgeRepository — backed by public.knowledge_documents
// and public.document_chunks using pgvector for similarity search.

import type { Pool } from "pg";
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

export interface PgKnowledgeRepositoryDeps {
  pool: Pool;
}

/** Format a JS number array as pgvector's text form: "[0.1,0.2,...]". */
function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

export function createPgKnowledgeRepository(
  deps: PgKnowledgeRepositoryDeps,
): IKnowledgeRepository {
  const { pool } = deps;

  return {
    async listDocuments(companyId, includeInactive) {
      const where: string[] = [];
      const params: unknown[] = [];
      if (companyId) {
        params.push(companyId);
        where.push(`company_id = $${params.length}`);
      }
      if (!includeInactive) where.push(`is_active = true`);
      const { rows } = await pool.query<KnowledgeDocumentRow>(
        `SELECT * FROM public.knowledge_documents
          ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY created_at DESC`,
        params,
      );
      return rows;
    },

    async listVersions(rootId) {
      const { rows } = await pool.query<KnowledgeDocumentRow>(
        `SELECT * FROM public.knowledge_documents
          WHERE id = $1 OR parent_document_id = $1
          ORDER BY version DESC`,
        [rootId],
      );
      return rows;
    },

    async insertDocument(input: KnowledgeDocumentInsert) {
      const { rows } = await pool.query<{ id: string; company_id: string }>(
        `INSERT INTO public.knowledge_documents
           (company_id, title, category, doc_code, file_path, file_type,
            content_text, status, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,'','processing',$7)
         RETURNING id, company_id`,
        [
          input.company_id,
          input.title,
          input.category,
          input.doc_code ?? null,
          input.file_path,
          input.file_type,
          input.uploaded_by ?? null,
        ],
      );
      return rows[0];
    },

    async getForProcessing(id) {
      const { rows } = await pool.query<
        Pick<KnowledgeDocumentRow, "id" | "company_id" | "file_path" | "file_type" | "title">
      >(
        `SELECT id, company_id, file_path, file_type, title
           FROM public.knowledge_documents WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    async markProcessing(id) {
      await pool.query(
        `UPDATE public.knowledge_documents
            SET status = 'processing', error = NULL, chunk_count = 0
          WHERE id = $1`,
        [id],
      );
    },

    async markReady(id, chunk_count, content_preview) {
      await pool.query(
        `UPDATE public.knowledge_documents
            SET status = 'ready',
                chunk_count = $2,
                content_text = $3,
                error = NULL
          WHERE id = $1`,
        [id, chunk_count, content_preview],
      );
    },

    async markFailed(id, message) {
      await pool.query(
        `UPDATE public.knowledge_documents
            SET status = 'failed', error = $2
          WHERE id = $1`,
        [id, message],
      );
    },

    async deleteChunks(document_id) {
      await pool.query(
        `DELETE FROM public.document_chunks WHERE document_id = $1`,
        [document_id],
      );
    },

    async insertChunks(rows: KnowledgeChunkInsert[]) {
      if (rows.length === 0) return;
      // Multi-row INSERT with pgvector text-cast per row. We build the
      // parameter list dynamically; embedding goes as a text literal that
      // pgvector accepts natively.
      const values: string[] = [];
      const params: unknown[] = [];
      let p = 1;
      for (const r of rows) {
        values.push(
          `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}::vector)`,
        );
        params.push(
          r.document_id,
          r.company_id,
          r.chunk_index,
          r.content,
          r.token_count,
          toVectorLiteral(r.embedding),
        );
      }
      await pool.query(
        `INSERT INTO public.document_chunks
           (document_id, company_id, chunk_index, content, token_count, embedding)
         VALUES ${values.join(",")}`,
        params,
      );
    },

    async getFilePath(id) {
      const { rows } = await pool.query<{ file_path: string | null }>(
        `SELECT file_path FROM public.knowledge_documents WHERE id = $1`,
        [id],
      );
      return rows[0]?.file_path ?? null;
    },

    async deleteDocument(id) {
      await pool.query(`DELETE FROM public.knowledge_documents WHERE id = $1`, [id]);
    },

    async searchSimilar(company_id, query_embedding, limit): Promise<KnowledgeMatch[]> {
      const { rows } = await pool.query<KnowledgeMatch>(
        `SELECT document_id, chunk_index, content, similarity
           FROM public.match_knowledge_chunks($1, $2::vector, $3)`,
        [company_id, toVectorLiteral(query_embedding), limit],
      );
      return rows;
    },
    async getDocumentsByIds(ids) {
      if (ids.length === 0) return [];
      const { rows } = await pool.query<{
        id: string; title: string; doc_code: string | null; version: number;
        section: string | null; page: number | null; department_id: string | null;
        updated_at: Date;
      }>(
        `SELECT id, title, doc_code, version, section, page, department_id, updated_at
           FROM public.knowledge_documents WHERE id = ANY($1)`,
        [ids],
      );
      return rows.map((row) => ({
        id: row.id, title: row.title, docCode: row.doc_code, version: row.version,
        section: row.section, page: row.page, departmentId: row.department_id,
        updatedAt: row.updated_at.toISOString(),
      }));
    },

    async getChunksContent(documentId, limit) {
      const { rows } = await pool.query<{ content: string }>(
        `SELECT content FROM public.document_chunks
          WHERE document_id = $1
          ORDER BY chunk_index ASC
          LIMIT $2`,
        [documentId, limit],
      );
      return rows.map((r) => r.content);
    },

    async getChunksForDocuments(documentIds, limit): Promise<KnowledgeChunkContentRow[]> {
      if (documentIds.length === 0) return [];
      const { rows } = await pool.query<KnowledgeChunkContentRow>(
        `SELECT document_id, chunk_index, content FROM public.document_chunks
          WHERE document_id = ANY($1)
          ORDER BY chunk_index ASC
          LIMIT $2`,
        [documentIds, limit],
      );
      return rows;
    },

    async getVersionAnchor(id) {
      const { rows } = await pool.query<KnowledgeVersionAnchor>(
        `SELECT id, company_id, doc_code, version, parent_document_id
           FROM public.knowledge_documents WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    async markReplaced(id) {
      await pool.query(
        `UPDATE public.knowledge_documents
            SET is_active = false, replaced_at = now()
          WHERE id = $1`,
        [id],
      );
    },

    async insertVersion(input: KnowledgeVersionInsert) {
      const { rows } = await pool.query<{ id: string; company_id: string }>(
        `INSERT INTO public.knowledge_documents
           (company_id, title, category, doc_code, file_path, file_type,
            content_text, status, uploaded_by, version, is_active,
            parent_document_id, change_notes)
         VALUES ($1,$2,$3,$4,$5,$6,'','processing',$7,$8,true,$9,$10)
         RETURNING id, company_id`,
        [
          input.company_id,
          input.title,
          input.category,
          input.doc_code ?? null,
          input.file_path,
          input.file_type,
          input.uploaded_by ?? null,
          input.version,
          input.parent_document_id,
          input.change_notes ?? null,
        ],
      );
      return rows[0];
    },

    async deactivateLineage(company_id, doc_code) {
      await pool.query(
        `UPDATE public.knowledge_documents
            SET is_active = false
          WHERE company_id = $1
            AND doc_code IS NOT DISTINCT FROM $2`,
        [company_id, doc_code],
      );
    },

    async activateDocument(id) {
      await pool.query(
        `UPDATE public.knowledge_documents
            SET is_active = true, replaced_at = NULL
          WHERE id = $1`,
        [id],
      );
    },

    async setCritical(id, is_critical) {
      await pool.query(
        `UPDATE public.knowledge_documents SET is_critical = $2 WHERE id = $1`,
        [id, is_critical],
      );
    },
  };
}

export const pgKnowledgeRepositoryFactory =
  (deps: PgKnowledgeRepositoryDeps) => (_dataCtx: unknown) =>
    createPgKnowledgeRepository(deps);
