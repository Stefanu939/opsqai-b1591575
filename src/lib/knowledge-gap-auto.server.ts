// Automatic Knowledge Gap recording — server-only.
//
// Knowledge Gap detection must NOT depend on the user pressing thumbs-down:
// the chat pipeline itself decides whether the answer was sufficiently
// supported by approved knowledge (see `detectGapSignal`) and records or
// updates the gap through the existing repository. User feedback stays
// optional extra evidence and reuses the same dedup path.

import { getKnowledgeGapRepository } from "@/lib/providers/registry";
import { normalizeGapQuestion, type GapSignal } from "@/lib/chat-grounding";

export interface AutoGapInput {
  companyId: string;
  question: string;
  departmentId?: string | null;
  createdBy: string;
  confidence?: number | null;
  sourceThreadId?: string | null;
  sourceMessageId?: string | null;
  reason?: Extract<GapSignal, { isGap: true }>["reason"];
}

/**
 * Creates the gap, or increments the occurrence count when a semantically
 * (Cloud) / textually (Self-Hosted) equivalent gap already exists.
 * Fail-open: never breaks the chat answer.
 */
export async function recordAutoKnowledgeGap(
  dataCtx: unknown,
  input: AutoGapInput,
): Promise<{ recorded: boolean }> {
  const question = (input.question ?? "").trim();
  if (question.length <= 4) return { recorded: false };
  try {
    const repo = getKnowledgeGapRepository(dataCtx);
    const norm = normalizeGapQuestion(question);
    const matched = await repo.matchExisting(input.companyId, norm);
    if (matched) {
      await repo.incrementOccurrence(matched);
      return { recorded: true };
    }
    await repo.create({
      companyId: input.companyId,
      questionNormalized: norm,
      questionSample: question.slice(0, 500),
      departmentId: input.departmentId ?? null,
      createdBy: input.createdBy,
      confidence: input.confidence ?? null,
      sourceThreadId: input.sourceThreadId ?? null,
      sourceMessageId: input.sourceMessageId ?? null,
    });
    return { recorded: true };
  } catch (error) {
    console.error("[knowledge-gap:auto]", input.reason ?? "unknown", error);
    return { recorded: false };
  }
}
