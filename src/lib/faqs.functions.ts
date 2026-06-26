import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { requireAnyPermission } from "@/lib/authorization";

const FaqInput = z.object({
  id: z.string().uuid().optional(),
  question_de: z.string().min(1),
  question_en: z.string().min(1),
  answer_de: z.string().min(1),
  answer_en: z.string().min(1),
  category: z.string().min(1),
});

export const upsertFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FaqInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["faq.edit", "faq.create", "knowledge.manage"]);

    if (data.id) {
      const { error } = await context.supabase.from("faqs").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: profile } = await context.supabase
        .from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
      if (!profile?.company_id) throw new Error("No company assigned");
      const { id: _ignore, ...insert } = data;
      void _ignore;
      const { error } = await context.supabase.from("faqs").insert({ ...insert, company_id: profile.company_id });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["faq.delete", "knowledge.manage"]);
    const { error } = await context.supabase.from("faqs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
