import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listKnowledgeGaps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("knowledge_gaps")
      .select("id, question_sample, question_normalized, occurrences, first_seen, last_seen, status, assignee_id, resolution, resolved_document_id, resolved_faq_id")
      .order("occurrences", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { gaps: data ?? [] };
  });

export const updateKnowledgeGap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["open", "assigned", "closed"]).optional(),
      assignee_id: z.string().uuid().nullable().optional(),
      resolution: z.enum(["sop", "faq", "dismissed"]).nullable().optional(),
      resolved_document_id: z.string().uuid().nullable().optional(),
      resolved_faq_id: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId)
      .in("role", ["admin", "manager"]);
    if (!roles || roles.length === 0) throw new Error("Forbidden");
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("knowledge_gaps").update(patch as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
