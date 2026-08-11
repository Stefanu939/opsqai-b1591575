// SOP versioning runs on both platforms. Every read/write goes through
// `IKnowledgeRepository`, so the Cloud implementation uses the user-scoped
// Supabase client (RLS) and Self-Hosted uses the local Postgres pool.
// No `getCloudSupabase` here — the lineage columns (version, is_active,
// parent_document_id, change_notes, replaced_at, is_critical) exist in both
// schemas (see migrations/selfhost/0010_kb_pgvector.sql).

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import {
  companyFromStoragePath,
  requireAnyPermission,
  resolveCompanyForWrite,
} from "@/lib/authorization";
import { getKnowledgeRepository, getStorageProvider } from "@/lib/providers/registry";
import { uuidString } from "@/lib/zod-uuid";

const KB_BUCKET = "knowledge-docs";

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

const ReplaceInput = z.object({
  previous_id: uuidString(),
  title: z.string().min(1),
  category: z.string().min(1),
  doc_code: z.string().min(1),
  file_path: z.string().min(1),
  file_type: z.string().min(1),
  filename: z.string().min(1),
  change_notes: z.string().optional(),
});

export const replaceDocumentVersion = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ReplaceInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "sop.edit", "sop.publish"]);
    const repo = getKnowledgeRepository(context.supabase);

    const prev = await repo.getVersionAnchor(data.previous_id);
    if (!prev) throw new Error("Previous version not found");
    const companyId = await resolveCompanyForWrite(
      context,
      companyFromStoragePath(data.file_path) ?? prev.company_id,
    );

    await repo.markReplaced(data.previous_id);

    const doc = await repo.insertVersion({
      company_id: companyId,
      title: data.title,
      category: data.category,
      doc_code: data.doc_code,
      file_path: data.file_path,
      file_type: data.file_type,
      uploaded_by: context.userId,
      version: prev.version + 1,
      parent_document_id: prev.parent_document_id ?? data.previous_id,
      change_notes: data.change_notes ?? null,
    });

    try {
      const bytes = await getStorageProvider().get(KB_BUCKET, data.file_path);
      const { extractText, chunkText } = await import("@/lib/doc-processing.server");
      const text = await extractText(toArrayBuffer(bytes), data.filename, data.file_type);
      if (!text.trim()) throw new Error("No text extracted");
      const chunks = chunkText(text, 1000, 200);
      const { embedTexts } = await import("@/lib/embeddings.server");
      const vecs: number[][] = [];
      for (let i = 0; i < chunks.length; i += 50) {
        vecs.push(...(await embedTexts(chunks.slice(i, i + 50))));
      }
      await repo.insertChunks(
        chunks.map((content, idx) => ({
          document_id: doc.id,
          company_id: doc.company_id,
          chunk_index: idx,
          content,
          token_count: Math.ceil(content.length / 4),
          embedding: vecs[idx],
        })),
      );
      await repo.markReady(doc.id, chunks.length, text.slice(0, 50000));
      return { ok: true, id: doc.id, chunks: chunks.length };
    } catch (err) {
      await repo.markFailed(doc.id, err instanceof Error ? err.message : String(err));
      throw err;
    }
  });

export const rollbackToVersion = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: uuidString() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "sop.edit", "sop.publish"]);
    const repo = getKnowledgeRepository(context.supabase);

    const target = await repo.getVersionAnchor(data.id);
    if (!target) throw new Error("Not found");
    const rootId = target.parent_document_id ?? data.id;

    await repo.deactivateLineage(target.company_id, target.doc_code);
    await repo.activateDocument(data.id);
    return { ok: true, root: rootId };
  });

export const setCriticalFlag = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: uuidString(), is_critical: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "sop.edit"]);
    await getKnowledgeRepository(context.supabase).setCritical(data.id, data.is_critical);
    return { ok: true };
  });
