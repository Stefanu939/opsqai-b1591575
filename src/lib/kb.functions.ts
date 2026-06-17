import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DocInput = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  content_text: z.string().default(""),
  file_path: z.string().nullable().optional(),
});

export const createKnowledgeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DocInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roles) throw new Error("Forbidden");

    const { error } = await context.supabase.from("knowledge_documents").insert({
      ...data,
      uploaded_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteKnowledgeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
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
