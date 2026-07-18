import { getCloudSupabase } from "@/lib/providers/not-available";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import {
  companyFromStoragePath,
  requireAnyPermission,
  resolveCompanyForWrite,
} from "@/lib/authorization";

const ReplaceInput = z.object({
  previous_id: z.string().uuid(),
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prev } = await supabaseAdmin
      .from("knowledge_documents")
      .select("id, version, company_id, doc_code, parent_document_id")
      .eq("id", data.previous_id)
      .maybeSingle();
    if (!prev) throw new Error("Previous version not found");
    const companyId = await resolveCompanyForWrite(
      context,
      companyFromStoragePath(data.file_path) ?? prev.company_id,
    );

    // Deactivate previous
    await supabaseAdmin
      .from("knowledge_documents")
      .update({ is_active: false, replaced_at: new Date().toISOString() } as never)
      .eq("id", data.previous_id);

    // Insert new active version
    const { data: doc, error: insErr } = await supabaseAdmin
      .from("knowledge_documents")
      .insert({
        title: data.title,
        category: data.category,
        doc_code: data.doc_code,
        file_path: data.file_path,
        file_type: data.file_type,
        content_text: "",
        status: "processing",
        uploaded_by: context.userId,
        company_id: companyId,
        version: (prev as { version: number }).version + 1,
        is_active: true,
        parent_document_id: prev.parent_document_id ?? data.previous_id,
        change_notes: data.change_notes ?? null,
      } as never)
      .select("id, company_id")
      .single();
    if (insErr || !doc) throw new Error(insErr?.message || "Insert failed");

    try {
      const { data: file, error: dlErr } = await supabaseAdmin.storage
        .from("knowledge-docs")
        .download(data.file_path);
      if (dlErr || !file) throw new Error(dlErr?.message || "Download failed");
      const buffer = await file.arrayBuffer();
      const { extractText, chunkText } = await import("@/lib/doc-processing.server");
      const text = await extractText(buffer, data.filename, data.file_type);
      if (!text.trim()) throw new Error("No text extracted");
      const chunks = chunkText(text, 1000, 200);
      const { embedTexts } = await import("@/lib/embeddings.server");
      const vecs: number[][] = [];
      for (let i = 0; i < chunks.length; i += 50) {
        vecs.push(...(await embedTexts(chunks.slice(i, i + 50))));
      }
      const rows = chunks.map((content, idx) => ({
        document_id: doc.id,
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
        } as never)
        .eq("id", doc.id);
      return { ok: true, id: doc.id, chunks: chunks.length };
    } catch (err) {
      await supabaseAdmin
        .from("knowledge_documents")
        .update({
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        } as never)
        .eq("id", doc.id);
      throw err;
    }
  });

export const rollbackToVersion = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "sop.edit", "sop.publish"]);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("knowledge_documents")
      .select("id, company_id, doc_code, parent_document_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!target) throw new Error("Not found");
    const rootId = (target as { parent_document_id: string | null }).parent_document_id ?? data.id;

    // Deactivate all versions sharing the same lineage and same doc_code
    await supabaseAdmin
      .from("knowledge_documents")
      .update({ is_active: false } as never)
      .eq("company_id", (target as { company_id: string }).company_id)
      .eq("doc_code", (target as { doc_code: string }).doc_code);
    await supabaseAdmin
      .from("knowledge_documents")
      .update({ is_active: true } as never)
      .eq("id", data.id);
    return { ok: true, root: rootId };
  });

export const setCriticalFlag = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), is_critical: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["knowledge.manage", "sop.edit"]);
    const { error } = await getCloudSupabase(context, "sop-versions")
      .from("knowledge_documents")
      .update({ is_critical: data.is_critical } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
