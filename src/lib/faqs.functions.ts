import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { requireAnyPermission, resolveCompanyForWrite } from "@/lib/authorization";
import { getFaqRepository } from "@/lib/providers/registry";

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
    const repo = getFaqRepository(context.dataCtx);

    const patch = {
      question_de: data.question_de,
      question_en: data.question_en,
      answer_de: data.answer_de,
      answer_en: data.answer_en,
      category: data.category,
    };

    if (data.id) {
      await repo.update(data.id, patch);
      const meta = await repo.getMetaById(data.id);
      if (meta?.company_id) {
        void emitWebhookEvent(meta.company_id, "faq.updated", {
          id: data.id,
          category: meta.category,
          question_en: meta.question_en,
        });
      }
    } else {
      const companyId = await resolveCompanyForWrite(context, data.company_id);
      const inserted = await repo.insert(companyId, patch);
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
    await getFaqRepository(context.dataCtx).delete(data.id);
    return { ok: true };
  });
