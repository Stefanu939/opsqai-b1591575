/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { getActorRoles } from "@/lib/authorization";
import { SYSTEM_DOC_CATALOG, type SystemDocEntry } from "@/lib/system-docs/catalog";
import { FEATURE_CATALOG } from "@/lib/feature-catalog";
import { renderSystemDoc, hashBody, chunkBody } from "@/lib/system-docs/render";

async function requirePlatformAdmin(context: { supabase: any; userId: string }) {
  const a = await getActorRoles(context.supabase, context.userId);
  if (!a.isPlatformAdmin) throw new Error("Forbidden: platform admin required");
  return a;
}

async function requireInternalAccess(context: { supabase: any; userId: string }) {
  // OPSQAI Internal workspace is platform-only.
  return requirePlatformAdmin(context);
}

/** Returns the implemented features (intersect catalog vs. shipped feature flags). */
function implementedEntries(): SystemDocEntry[] {
  const enabled = new Set(
    FEATURE_CATALOG.filter((f) => f.defaultState !== "coming_soon").map((f) => f.key),
  );
  return SYSTEM_DOC_CATALOG.filter((e) => !e.featureKey || enabled.has(e.featureKey));
}

export const getInternalWorkspaceInfo = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireInternalAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id, name, created_at")
      .eq("is_system", true)
      .maybeSingle();
    if (!company) throw new Error("OPSQAI Internal workspace missing");
    const [{ count: docCount }, { count: catalogCount }] = await Promise.all([
      supabaseAdmin
        .from("knowledge_documents")
        .select("id", { count: "exact", head: true })
        .eq("company_id", (company as any).id)
        .eq("knowledge_type", "system")
        .eq("is_active", true),
      supabaseAdmin.from("system_doc_catalog").select("slug", { count: "exact", head: true }),
    ]);
    return {
      companyId: (company as any).id as string,
      name: (company as any).name as string,
      createdAt: (company as any).created_at as string,
      docCount: docCount ?? 0,
      catalogCount: catalogCount ?? 0,
      catalogTotal: implementedEntries().length,
    };
  });

export const listSystemDocs = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireInternalAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("is_system", true)
      .maybeSingle();
    if (!company) return [];
    const { data, error } = await supabaseAdmin
      .from("knowledge_documents")
      .select("id, title, category, system_slug, updated_at, chunk_count")
      .eq("company_id", (company as any).id)
      .eq("knowledge_type", "system")
      .eq("is_active", true)
      .order("category")
      .order("title");
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      title: string;
      category: string;
      system_slug: string;
      updated_at: string;
      chunk_count: number;
    }>;
  });

export const getSystemDoc = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireInternalAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("system_doc_catalog")
      .select("slug, title, category, body_md, related_slugs, updated_at")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!row) throw new Error("Document not found");
    return row as {
      slug: string;
      title: string;
      category: string;
      body_md: string;
      related_slugs: string[];
      updated_at: string;
    };
  });

export const regenerateSystemKnowledge = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ force: z.boolean().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { embedTexts } = await import("@/lib/embeddings.server");

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("is_system", true)
      .maybeSingle();
    if (!company) throw new Error("OPSQAI Internal workspace missing");
    const companyId = (company as any).id as string;

    const entries = implementedEntries();
    let upserted = 0;
    let reembedded = 0;
    let unchanged = 0;

    for (const entry of entries) {
      const body = renderSystemDoc(entry);
      const hash = hashBody(body);

      const { data: existingCat } = await supabaseAdmin
        .from("system_doc_catalog")
        .select("slug, body_hash, document_id, version")
        .eq("slug", entry.slug)
        .maybeSingle();

      const needsReembed = data.force || !existingCat || (existingCat as any).body_hash !== hash;

      // Upsert/locate knowledge document
      let documentId = (existingCat as any)?.document_id as string | null | undefined;
      if (documentId) {
        const { data: docRow } = await supabaseAdmin
          .from("knowledge_documents")
          .select("id")
          .eq("id", documentId)
          .maybeSingle();
        if (!docRow) documentId = null;
      }
      if (!documentId) {
        // try by (company, system_slug)
        const { data: existing } = await supabaseAdmin
          .from("knowledge_documents")
          .select("id")
          .eq("company_id", companyId)
          .eq("system_slug", entry.slug)
          .maybeSingle();
        documentId = (existing as any)?.id ?? null;
      }

      if (!documentId) {
        const { data: inserted, error: insErr } = await supabaseAdmin
          .from("knowledge_documents")
          .insert({
            company_id: companyId,
            title: entry.title,
            category: entry.category,
            content_text: body.slice(0, 50000),
            status: "ready",
            knowledge_type: "system",
            system_slug: entry.slug,
            doc_code: `SYS-${entry.slug.replace(/\//g, "-").toUpperCase()}`.slice(0, 80),
            file_type: "system",
            is_active: true,
            is_critical: false,
          } as any)
          .select("id")
          .single();
        if (insErr) throw new Error(insErr.message);
        documentId = (inserted as any).id;
      } else if (needsReembed) {
        await supabaseAdmin
          .from("knowledge_documents")
          .update({
            title: entry.title,
            category: entry.category,
            content_text: body.slice(0, 50000),
            status: "ready",
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", documentId);
      }

      if (needsReembed) {
        await supabaseAdmin.from("document_chunks").delete().eq("document_id", documentId!);
        const chunks = chunkBody(body);
        const vecs: number[][] = [];
        for (let i = 0; i < chunks.length; i += 50) {
          vecs.push(...(await embedTexts(chunks.slice(i, i + 50))));
        }
        const rows = chunks.map((content, idx) => ({
          document_id: documentId,
          company_id: companyId,
          chunk_index: idx,
          content,
          token_count: Math.ceil(content.length / 4),
          embedding: `[${vecs[idx].join(",")}]`,
          section: entry.category,
        }));
        const { error: chunkErr } = await supabaseAdmin.from("document_chunks").insert(rows as any);
        if (chunkErr) throw new Error(chunkErr.message);
        await supabaseAdmin
          .from("knowledge_documents")
          .update({ chunk_count: chunks.length } as any)
          .eq("id", documentId!);
        reembedded += 1;
      } else {
        unchanged += 1;
      }

      // Upsert catalog row
      const { error: catErr } = await supabaseAdmin.from("system_doc_catalog").upsert({
        slug: entry.slug,
        category: entry.category,
        title: entry.title,
        body_md: body,
        body_hash: hash,
        related_slugs: entry.relatedSlugs,
        feature_key: entry.featureKey ?? null,
        document_id: documentId,
        version: ((existingCat as any)?.version ?? 0) + (needsReembed ? 1 : 0),
        updated_at: new Date().toISOString(),
      } as any);
      if (catErr) throw new Error(catErr.message);
      upserted += 1;
    }

    // Audit
    await supabaseAdmin.from("audit_log").insert({
      user_id: context.userId,
      company_id: companyId,
      module: "platform",
      action: "regenerate_system_knowledge",
      severity: "info",
      success: true,
      new_value: { upserted, reembedded, unchanged, force: !!data.force } as any,
    } as any);

    return { upserted, reembedded, unchanged, total: entries.length };
  });
