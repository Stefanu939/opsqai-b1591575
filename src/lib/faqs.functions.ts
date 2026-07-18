import { getCloudSupabase } from "@/lib/providers/not-available";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
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
  .middleware([requireAuth])
  .inputValidator((d: unknown) => FaqInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["faq.edit", "faq.create", "knowledge.manage"]);

    const { emitWebhookEvent } = await import("@/lib/webhook-dispatch.server");

    if (data.id) {
      const { id, company_id: _companyIgnore, ...patch } = data;
      void id;
      void _companyIgnore;
      const { error } = await getCloudSupabase(context, "faqs").from("faqs").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      const { data: row } = await getCloudSupabase(context, "faqs")
        .from("faqs")
        .select("company_id, category, question_en")
        .eq("id", data.id)
        .maybeSingle();
      if (row?.company_id) {
        void emitWebhookEvent(row.company_id as string, "faq.updated", {
          id: data.id,
          category: row.category,
          question_en: row.question_en,
        });
      }
    } else {
      const { id: _ignore, ...insert } = data;
      void _ignore;
      const companyId = await resolveCompanyForWrite(context, data.company_id);
      const { company_id: _companyIgnore, ...safeInsert } = insert;
      void _companyIgnore;
      const { data: inserted, error } = await getCloudSupabase(context, "faqs")
        .from("faqs")
        .insert({ ...safeInsert, company_id: companyId })
        .select("id, category, question_en")
        .single();
      if (error) throw new Error(error.message);
      void emitWebhookEvent(companyId, "faq.created", {
        id: inserted.id,
        category: inserted.category,
        question_en: inserted.question_en,
      });
    }
    return { ok: true };
  });

export const deleteFaq = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAnyPermission(context, ["faq.delete", "knowledge.manage"]);
    const { error } = await getCloudSupabase(context, "faqs").from("faqs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
