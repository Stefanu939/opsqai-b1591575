// Knowledge Gap → AI draft → human review → publish.
//
// Strictly draft-first: generation NEVER publishes and never resolves a gap.
// A human reviews and edits the draft, then explicitly approves it, which
// publishes it into the knowledge base (SOP) or the FAQ list and links the
// gap to the artefact that closed it.

import {
  getFaqRepository,
  getKnowledgeGapRepository,
  getKnowledgeRepository,
  getStorageProvider,
} from "@/lib/providers/registry";
import { resolveChatModel } from "@/lib/ai-provider.server";

export type DraftKind = "sop" | "faq";
export type DraftLanguage = "en" | "de" | "ro";

interface Ctx {
  supabase: unknown;
  userId: string;
}

export interface SopDraft {
  kind: "sop";
  title: string;
  category: string;
  markdown: string;
}

export interface FaqDraft {
  kind: "faq";
  category: string;
  question_en: string;
  question_de: string;
  answer_en: string;
  answer_de: string;
}

export type GapDraft = SopDraft | FaqDraft;

async function llm(prompt: string, system: string): Promise<string> {
  const { generateText } = await import("ai");
  const { text } = await generateText({
    model: resolveChatModel("chat-fast"),
    temperature: 0.25,
    system,
    prompt,
  });
  return text;
}

async function knowledgeContext(ctx: Ctx, companyId: string): Promise<string> {
  try {
    const docs = await getKnowledgeRepository(ctx.supabase as never).listDocuments(companyId, false);
    const lines = docs
      .slice(0, 40)
      .map((d) => `- ${d.title}${d.category ? ` [${d.category}]` : ""}`);
    return lines.length ? lines.join("\n") : "(no documents published yet)";
  } catch {
    return "(knowledge base unavailable)";
  }
}

function jsonFrom(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Generate a draft only — nothing is stored, nothing is resolved. */
export async function draftFromGap(
  ctx: Ctx,
  companyId: string,
  input: {
    kind: DraftKind;
    question: string;
    department?: string | null;
    category?: string | null;
    language?: DraftLanguage;
  },
): Promise<GapDraft> {
  const context = await knowledgeContext(ctx, companyId);
  const language = (input.language ?? "en").toUpperCase();

  if (input.kind === "sop") {
    const system = `You draft enterprise Standard Operating Procedures in clean Markdown.
Sections in order: Title, Purpose, Scope, Roles & Responsibilities, Inputs, Procedure (numbered steps), Safety & Risks, Outputs, Approvals, Revision History.
Ground every statement in the existing knowledge base context; never invent regulations or absolute legal claims.
Output ONLY the Markdown document.`;
    const markdown = await llm(
      `Language: ${language}
Unanswered employee question: "${input.question}"
Department: ${input.department ?? "Company-wide"}

Existing knowledge base:
${context}

Draft the SOP now.`,
      system,
    );
    const titleLine = markdown.split("\n").find((l) => l.trim().startsWith("#"));
    const title = (titleLine ? titleLine.replace(/^#+\s*/, "") : input.question)
      .trim()
      .slice(0, 180);
    return {
      kind: "sop",
      title: title || input.question.slice(0, 180),
      category: input.category ?? input.department ?? "General",
      markdown,
    };
  }

  const system = `You draft concise bilingual FAQ entries for an internal operations platform.
Answer in 2-5 sentences, operational and specific, grounded strictly in the provided knowledge base context.
Output strict JSON only: {"question_en":"...","question_de":"...","answer_en":"...","answer_de":"...","category":"..."}`;
  const raw = await llm(
    `Language preference: ${language}
Unanswered employee question: "${input.question}"
Department: ${input.department ?? "Company-wide"}

Existing knowledge base:
${context}

Produce the FAQ JSON now.`,
    system,
  );
  const parsed = jsonFrom(raw) ?? {};
  const qEn = String(parsed["question_en"] ?? input.question).slice(0, 400);
  const aEn = String(parsed["answer_en"] ?? "").slice(0, 4000);
  if (!aEn.trim()) throw new Error("draft_generation_failed");
  return {
    kind: "faq",
    category: String(parsed["category"] ?? input.category ?? input.department ?? "General"),
    question_en: qEn,
    question_de: String(parsed["question_de"] ?? qEn).slice(0, 400),
    answer_en: aEn,
    answer_de: String(parsed["answer_de"] ?? aEn).slice(0, 4000),
  };
}

async function closeGap(
  ctx: Ctx,
  companyId: string,
  gapId: string | null | undefined,
  patch: { resolution: DraftKind; resolved_document_id?: string; resolved_faq_id?: string },
): Promise<boolean> {
  if (!gapId) return false;
  try {
    await getKnowledgeGapRepository(ctx.supabase as never).update(companyId, gapId, {
      status: "resolved",
      resolution: patch.resolution,
      resolved_document_id: patch.resolved_document_id ?? null,
      resolved_faq_id: patch.resolved_faq_id ?? null,
      resolution_date: new Date().toISOString(),
    } as never);
    return true;
  } catch {
    return false;
  }
}

/** Publish the human-approved draft and link it back to the gap. */
export async function publishGapDraft(
  ctx: Ctx,
  companyId: string,
  input: {
    gapId?: string | null;
    draft: GapDraft;
  },
): Promise<{ kind: DraftKind; title: string; documentId?: string; faqId?: string; gapResolved: boolean }> {
  if (input.draft.kind === "sop") {
    const { title, category, markdown } = input.draft;
    const key = `${companyId}/${crypto.randomUUID()}-${title.replace(/[^a-z0-9]+/gi, "-")}.md`;
    await getStorageProvider().put({
      bucket: "knowledge-docs",
      key,
      body: new TextEncoder().encode(markdown),
      contentType: "text/markdown",
    });
    const doc = await getKnowledgeRepository(ctx.supabase as never).insertDocument({
      company_id: companyId,
      title,
      category,
      doc_code: null,
      file_path: key,
      file_type: "text/markdown",
      uploaded_by: ctx.userId,
    });
    try {
      const { reprocessDocument } = await import("@/lib/kb.functions");
      await (
        reprocessDocument as unknown as {
          handler?: (a: { data: { id: string }; context: unknown }) => Promise<unknown>;
        }
      ).handler?.({ data: { id: doc.id }, context: ctx });
    } catch {
      /* indexing retried by the KB pipeline */
    }
    const gapResolved = await closeGap(ctx, companyId, input.gapId, {
      resolution: "sop",
      resolved_document_id: doc.id,
    });
    return { kind: "sop", title, documentId: doc.id, gapResolved };
  }

  const d = input.draft;
  const inserted = await getFaqRepository(ctx.supabase as never).insert(companyId, {
    question_en: d.question_en,
    question_de: d.question_de,
    answer_en: d.answer_en,
    answer_de: d.answer_de,
    category: d.category,
  });
  const gapResolved = await closeGap(ctx, companyId, input.gapId, {
    resolution: "faq",
    resolved_faq_id: inserted.id,
  });
  return { kind: "faq", title: d.question_en, faqId: inserted.id, gapResolved };
}
