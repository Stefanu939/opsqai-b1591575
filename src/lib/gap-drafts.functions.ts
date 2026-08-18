// Server functions for the Knowledge Gap → AI draft → human review → publish
// flow. Generation never publishes; publishing is an explicit approval step.

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { uuidString } from "@/lib/zod-uuid";

const DraftRequest = z.object({
  kind: z.enum(["sop", "faq"]),
  question: z.string().min(4).max(600),
  department: z.string().max(120).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  language: z.enum(["en", "de", "ro"]).optional(),
});

const SopDraftSchema = z.object({
  kind: z.literal("sop"),
  title: z.string().min(2).max(180),
  category: z.string().min(1).max(120),
  markdown: z.string().min(20).max(60000),
});

const FaqDraftSchema = z.object({
  kind: z.literal("faq"),
  category: z.string().min(1).max(120),
  question_en: z.string().min(4).max(400),
  question_de: z.string().min(1).max(400),
  answer_en: z.string().min(4).max(4000),
  answer_de: z.string().min(1).max(4000),
});

const PublishRequest = z.object({
  gap_id: uuidString().nullable().optional(),
  draft: z.discriminatedUnion("kind", [SopDraftSchema, FaqDraftSchema]),
});

export const draftGapDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => DraftRequest.parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "knowledge_gaps");
    const [{ requireAnyPermission }, { resolveDashboardCompany }, { draftFromGap }] =
      await Promise.all([
        import("@/lib/authorization"),
        import("@/lib/dashboard-search.server"),
        import("@/lib/gap-drafts.server"),
      ]);
    await requireAnyPermission(context, ["knowledge.manage", "sop.generate", "faq.create"]);
    const { companyId } = await resolveDashboardCompany(context as never, null);
    return draftFromGap({ supabase: context.supabase, userId: context.userId }, companyId, {
      kind: data.kind,
      question: data.question,
      department: data.department ?? null,
      category: data.category ?? null,
      language: data.language ?? "en",
    });
  });

export const publishGapDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => PublishRequest.parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "knowledge_gaps");
    const [{ requireAnyPermission }, { resolveDashboardCompany }, { publishGapDraft }] =
      await Promise.all([
        import("@/lib/authorization"),
        import("@/lib/dashboard-search.server"),
        import("@/lib/gap-drafts.server"),
      ]);
    await requireAnyPermission(
      context,
      data.draft.kind === "sop" ? ["sop.publish", "knowledge.manage"] : ["faq.create", "faq.manage"],
    );
    const { companyId } = await resolveDashboardCompany(context as never, null);
    return publishGapDraft({ supabase: context.supabase, userId: context.userId }, companyId, {
      gapId: data.gap_id ?? null,
      draft: data.draft,
    });
  });
