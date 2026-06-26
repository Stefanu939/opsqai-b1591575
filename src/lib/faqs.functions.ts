import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { requireAnyPermission, resolveCompanyForWrite } from "@/lib/authorization";

const FaqInput = z.object({
  id: z.string().uuid().optional(),
  question_de: z.string().min(1),
  question_en: z.string().min(1),
  answer_de: z.string().min(1),
  answer_en: z.string().min(1),
  category: z.string().min(1),
  company_id: z.string().uuid().optional().nullable(),
});

export const upsertFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FaqInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["faq.edit", "faq.create", "knowledge.manage"]);

    if (data.id) {
      const { id, company_id: _companyIgnore, ...patch } = data;
      void id; void _companyIgnore;
      const { error } = await context.supabase.from("faqs").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { id: _ignore, ...insert } = data;
      void _ignore;
      const companyId = await resolveCompanyForWrite(context, data.company_id);
      const { company_id: _companyIgnore, ...safeInsert } = insert;
      void _companyIgnore;
      const { error } = await context.supabase.from("faqs").insert({ ...safeInsert, company_id: companyId });
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
