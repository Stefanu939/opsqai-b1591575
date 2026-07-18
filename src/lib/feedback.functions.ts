import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";

import { getProfileRepository } from "@/lib/providers/registry";
import {
  getFeedbackRepository,
  getKnowledgeGapRepository,
  getMessageRepository,
} from "@/lib/providers/registry";

export const rateMessage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        message_id: z.string().uuid(),
        rating: z.union([z.literal(-1), z.literal(1)]),
        comment: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const profile = await getProfileRepository(context.supabase).findByUserId(
      context.userId,
    );
    if (!profile?.companyId) throw new Error("No company");
    const { companyId, departmentId } = profile;

    await getFeedbackRepository(context.supabase).upsertRating({
      messageId: data.message_id,
      userId: context.userId,
      companyId,
      rating: data.rating,
      comment: data.comment ?? null,
    });

    // Thumbs-down: surface as a Knowledge Gap (semantic dedup on Cloud,
    // exact-text dedup on Self-Hosted).
    if (data.rating === -1) {
      try {
        const messageRepo = getMessageRepository(context.supabase);
        const gapRepo = getKnowledgeGapRepository(context.supabase);

        const asst = await messageRepo.findAssistantById(data.message_id);
        if (!asst) return { ok: true };
        const prevUser = await messageRepo.findLastUserBefore(asst.threadId, asst.createdAt);
        if (!prevUser || prevUser.content.trim().length <= 4) return { ok: true };

        const q = prevUser.content;
        const norm = q.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 500);
        const matched = await gapRepo.matchExisting(companyId, norm);
        if (matched) {
          await gapRepo.incrementOccurrence(matched);
        } else {
          await gapRepo.create({
            companyId,
            questionNormalized: norm,
            questionSample: q.slice(0, 500),
            departmentId,
            createdBy: context.userId,
            confidence: asst.confidence,
            sourceThreadId: asst.threadId,
            sourceMessageId: asst.id,
          });
        }
      } catch (e) {
        console.error("[feedback:gap] failed", e);
      }
    }
    return { ok: true };
  });
