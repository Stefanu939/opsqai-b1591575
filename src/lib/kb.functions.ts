import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import {
  companyFromStoragePath,
  requireAnyPermission,
  resolveCompanyForWrite,
} from "@/lib/authorization";
import {
  getKnowledgeRepository,
  getStorageProvider,
} from "@/lib/providers/registry";

const KB_BUCKET = "knowledge-docs";

const DocInput = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  doc_code: z.string().optional().nullable(),
  file_path: z.string().min(1),
  file_type: z.string().min(1),
  filename: z.string().min(1),
});

/** Uint8Array → ArrayBuffer copy (safe slice; independent of underlying buffer). */
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

async function runProcessingPipeline(
  documentId: string,
  companyId: string,
  filePath: string,
  fileType: string,
  filename: string,
) {
  const repo = getKnowledgeRepository(undefined);
  const storage = getStorageProvider();

  const bytes = await storage.get(KB_BUCKET, filePath);
  const { extractText, chunkText } = await import("@/lib/doc-processing.server");
  const text = await extractText(toArrayBuffer(bytes), filename, fileType);
  if (!text.trim()) throw new Error("No text extracted from document");

  const chunks = chunkText(text, 1000, 200);
  if (chunks.length === 0) throw new Error("Document produced no chunks");

  const { embedTexts } = await import("@/lib/embeddings.server");
  const embeddings: number[][] = [];
  const BATCH = 50;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const vecs = await embedTexts(chunks.slice(i, i + BATCH));
    embeddings.push(...vecs);
  }

  await repo.insertChunks(
    chunks.map((content, idx) => ({
      document_id: documentId,
      company_id: companyId,
      chunk_index: idx,
      content,
      token_count: Math.ceil(content.length / 4),
      embedding: embeddings[idx],
    })),
  );

  await repo.markReady(documentId, chunks.length, text.slice(0, 50000));
  return chunks.length;
}

/**
 * Create the document row then run the full extract → chunk → embed pipeline.
 * Storage upload happens client-side first; we then download server-side and process.
 */
export const processDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => DocInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "sop.create"]);
    const companyId = await resolveCompanyForWrite(
      context,
      companyFromStoragePath(data.file_path),
    );

    const repo = getKnowledgeRepository(context.supabase);
    const doc = await repo.insertDocument({
      company_id: companyId,
      title: data.title,
      category: data.category,
      doc_code: data.doc_code ?? null,
      file_path: data.file_path,
      file_type: data.file_type,
      uploaded_by: context.userId,
    });

    try {
      const chunks = await runProcessingPipeline(
        doc.id,
        doc.company_id,
        data.file_path,
        data.file_type,
        data.filename,
      );

      // Fire outbound webhook (fire-and-forget)
      const { emitWebhookEvent } = await import("@/lib/webhook-dispatch.server");
      void emitWebhookEvent(doc.company_id, "knowledge.published", {
        id: doc.id,
        title: data.title,
        category: data.category,
        doc_code: data.doc_code ?? null,
        chunks,
      });

      return { ok: true, id: doc.id, chunks };
    } catch (err) {
      await repo.markFailed(
        doc.id,
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }
  });

export const reprocessDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "sop.edit"]);

    const repo = getKnowledgeRepository(context.supabase);
    const doc = await repo.getForProcessing(data.id);
    if (!doc || !doc.file_path) throw new Error("Document or file not found");

    await repo.deleteChunks(data.id);
    await repo.markProcessing(data.id);

    try {
      const chunks = await runProcessingPipeline(
        data.id,
        doc.company_id,
        doc.file_path,
        doc.file_type ?? "",
        doc.file_path,
      );
      return { ok: true, chunks };
    } catch (err) {
      await repo.markFailed(
        data.id,
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }
  });

export const deleteKnowledgeDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "sop.delete"]);
    const repo = getKnowledgeRepository(context.supabase);
    const filePath = await repo.getFilePath(data.id);
    if (filePath) {
      try {
        await getStorageProvider().delete(KB_BUCKET, filePath);
      } catch {
        // Best-effort: continue with row deletion even if the blob is gone.
      }
    }
    await repo.deleteDocument(data.id);
    return { ok: true };
  });
