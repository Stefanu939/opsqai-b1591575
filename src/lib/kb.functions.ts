import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  companyFromStoragePath,
  requireAnyPermission,
  resolveCompanyForWrite,
} from "@/lib/authorization";

const DocInput = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  doc_code: z.string().optional().nullable(),
  file_path: z.string().min(1),
  file_type: z.string().min(1),
  filename: z.string().min(1),
});

/**
 * Create the document row then run the full extract → chunk → embed pipeline.
 * Storage upload happens client-side first; we then download server-side and process.
 */
export const processDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DocInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "sop.create"]);
    const companyId = await resolveCompanyForWrite(context, companyFromStoragePath(data.file_path));

    // Insert document in 'processing' state
    const { data: doc, error: insErr } = await context.supabase
      .from("knowledge_documents")
      .insert({
        title: data.title,
        category: data.category,
        doc_code: data.doc_code ?? null,
        file_path: data.file_path,
        file_type: data.file_type,
        content_text: "",
        status: "processing",
        uploaded_by: context.userId,
        company_id: companyId,
      })
      .select("id, company_id")
      .single();
    if (insErr || !doc) throw new Error(insErr?.message || "Insert failed");

    // Process in same request (server function timeout is generous on Workers)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: file, error: dlErr } = await supabaseAdmin.storage
        .from("knowledge-docs")
        .download(data.file_path);
      if (dlErr || !file) throw new Error(dlErr?.message || "Download failed");

      const buffer = await file.arrayBuffer();
      const { extractText, chunkText } = await import("@/lib/doc-processing.server");
      const text = await extractText(buffer, data.filename, data.file_type);
      if (!text.trim()) throw new Error("No text extracted from document");

      const chunks = chunkText(text, 1000, 200);
      if (chunks.length === 0) throw new Error("Document produced no chunks");

      const { embedTexts } = await import("@/lib/embeddings.server");
      // Embed in batches of 50 to stay within request limits
      const allEmbeddings: number[][] = [];
      const BATCH = 50;
      for (let i = 0; i < chunks.length; i += BATCH) {
        const batch = chunks.slice(i, i + BATCH);
        const vecs = await embedTexts(batch);
        allEmbeddings.push(...vecs);
      }

      // Insert chunks
      const rows = chunks.map((content, idx) => ({
        document_id: doc.id,
        company_id: doc.company_id,
        chunk_index: idx,
        content,
        token_count: Math.ceil(content.length / 4),
        embedding: allEmbeddings[idx] as unknown as string,
      }));
      // Convert vector arrays into pgvector textual form
      const rowsForInsert = rows.map((r) => ({
        ...r,
        embedding: `[${(allEmbeddings[r.chunk_index] as number[]).join(",")}]`,
      }));
      const { error: chunkErr } = await supabaseAdmin
        .from("document_chunks")
        .insert(rowsForInsert as never);
      if (chunkErr) throw new Error(chunkErr.message);

      await supabaseAdmin
        .from("knowledge_documents")
        .update({
          status: "ready",
          chunk_count: chunks.length,
          content_text: text.slice(0, 50000),
          error: null,
        })
        .eq("id", doc.id);

      // Fire outbound webhook (fire-and-forget)
      const { emitWebhookEvent } = await import("@/lib/webhook-dispatch.server");
      void emitWebhookEvent(doc.company_id as string, "knowledge.published", {
        id: doc.id,
        title: data.title,
        category: data.category,
        doc_code: data.doc_code ?? null,
        chunks: chunks.length,
      });

      return { ok: true, id: doc.id, chunks: chunks.length };
    } catch (err) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("knowledge_documents")
        .update({ status: "failed", error: err instanceof Error ? err.message : String(err) })
        .eq("id", doc.id);
      throw err;
    }
  });

export const reprocessDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "sop.edit"]);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: doc } = await supabaseAdmin
      .from("knowledge_documents")
      .select("file_path, file_type, title, company_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!doc || !doc.file_path) throw new Error("Document or file not found");

    await supabaseAdmin.from("document_chunks").delete().eq("document_id", data.id);
    await supabaseAdmin
      .from("knowledge_documents")
      .update({ status: "processing", error: null, chunk_count: 0 })
      .eq("id", data.id);

    try {
      const { data: file } = await supabaseAdmin.storage
        .from("knowledge-docs")
        .download(doc.file_path);
      if (!file) throw new Error("File not found in storage");
      const buffer = await file.arrayBuffer();
      const { extractText, chunkText } = await import("@/lib/doc-processing.server");
      const text = await extractText(buffer, doc.file_path, doc.file_type || "");
      const chunks = chunkText(text, 1000, 200);
      const { embedTexts } = await import("@/lib/embeddings.server");
      const vecs: number[][] = [];
      for (let i = 0; i < chunks.length; i += 50) {
        vecs.push(...(await embedTexts(chunks.slice(i, i + 50))));
      }
      const rows = chunks.map((content, idx) => ({
        document_id: data.id,
        company_id: doc.company_id,
        chunk_index: idx,
        content,
        token_count: Math.ceil(content.length / 4),
        embedding: `[${vecs[idx].join(",")}]`,
      }));
      await supabaseAdmin.from("document_chunks").insert(rows as never);
      await supabaseAdmin
        .from("knowledge_documents")
        .update({
          status: "ready",
          chunk_count: chunks.length,
          content_text: text.slice(0, 50000),
          error: null,
        })
        .eq("id", data.id);
      return { ok: true, chunks: chunks.length };
    } catch (err) {
      await supabaseAdmin
        .from("knowledge_documents")
        .update({ status: "failed", error: err instanceof Error ? err.message : String(err) })
        .eq("id", data.id);
      throw err;
    }
  });

export const deleteKnowledgeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "sop.delete"]);
    const { data: doc } = await context.supabase
      .from("knowledge_documents")
      .select("file_path")
      .eq("id", data.id)
      .maybeSingle();
    if (doc?.file_path) {
      await context.supabase.storage.from("knowledge-docs").remove([doc.file_path]);
    }
    const { error } = await context.supabase.from("knowledge_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
