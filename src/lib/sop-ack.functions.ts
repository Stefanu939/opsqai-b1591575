import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";

export const acknowledgeSop = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ document_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase
      .from("knowledge_documents")
      .select("id, version, company_id, is_critical")
      .eq("id", data.document_id)
      .maybeSingle();
    if (!doc) throw new Error("Not found");
    const { error } = await context.supabase.from("sop_acknowledgements").insert({
      company_id: doc.company_id,
      document_id: doc.id,
      document_version: (doc as { version: number }).version,
      user_id: context.userId,
    } as never);
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const listPendingCriticalSops = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { data: docs } = await context.supabase
      .from("knowledge_documents")
      .select("id, title, doc_code, version, updated_at")
      .eq("is_critical", true)
      .eq("is_active", true);
    const ids = (docs ?? []).map((d) => d.id);
    if (!ids.length) return { pending: [] };
    const { data: acks } = await context.supabase
      .from("sop_acknowledgements")
      .select("document_id, document_version")
      .eq("user_id", context.userId)
      .in("document_id", ids);
    const ackSet = new Set((acks ?? []).map((a) => `${a.document_id}:${a.document_version}`));
    const pending = (docs ?? []).filter(
      (d) => !ackSet.has(`${d.id}:${(d as { version: number }).version}`),
    );
    return { pending };
  });
