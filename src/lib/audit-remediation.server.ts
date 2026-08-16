// AI Audit → auto-remediation.
//
// Turns an audit recommendation into a real artefact:
//   • kind "sop" → generates a full Markdown SOP, publishes it into the
//     knowledge base (indexed like any uploaded document).
//   • kind "faq" → generates a bilingual (EN/DE) FAQ entry and inserts it.
//
// Both paths are grounded in what the workspace already knows: the existing
// document titles/categories are handed to the model so the generated
// artefact matches house style and does not contradict published procedures.
// When the recommendation came from a knowledge gap, that gap is closed and
// linked to the artefact that resolved it.

import {
  getFaqRepository,
  getKnowledgeGapRepository,
  getKnowledgeRepository,
  getStorageProvider,
} from "@/lib/providers/registry";
import { resolveChatModel } from "@/lib/ai-provider.server";

export type RemediationKind = "sop" | "faq";

export interface RemediationInput {
  kind: RemediationKind;
  question: string;
  department?: string | null;
  category?: string | null;
  language?: "en" | "de" | "ro";
  gapId?: string | null;
}

export interface RemediationResult {
  kind: RemediationKind;
  title: string;
  documentId?: string;
  faqId?: string;
  gapResolved: boolean;
}

interface Ctx {
  supabase: unknown;
  userId: string;
}

async function llm(prompt: string, system: string, temperature = 0.25): Promise<string> {
  const { generateText } = await import("ai");
  const { text } = await generateText({
    model: resolveChatModel("chat-fast"),
    temperature,
    system,
    prompt,
  });
  return text;
}

/** Titles + categories already published — used as grounding context. */
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

async function closeGap(
  ctx: Ctx,
  companyId: string,
  gapId: string | null | undefined,
  patch: { resolution: "sop" | "faq"; resolved_document_id?: string; resolved_faq_id?: string },
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

async function generateSopArtefact(
  ctx: Ctx,
  companyId: string,
  input: RemediationInput,
): Promise<RemediationResult> {
  const lang = (input.language ?? "en").toUpperCase();
  const context = await knowledgeContext(ctx, companyId);

  const system = `You write enterprise Standard Operating Procedures in clean Markdown.
Sections in this exact order: Title, Purpose, Scope, Roles & Responsibilities, Inputs, Procedure (numbered steps), Safety & Risks, Outputs, Approvals, Revision History.
Be concrete and operational. Never invent regulations, vendor names, or numbers you cannot justify — write "[to confirm]" instead.
Output ONLY the markdown, starting with a single "# " title line.`;

  const markdown = await llm(
    `Language: ${lang}
Department: ${input.department ?? "Company-wide"}
Unanswered question this SOP must close: "${input.question}"

Existing knowledge base (for house style and to avoid duplication):
${context}

Write the SOP that answers the question above end to end.`,
    system,
  );

  const firstLine = markdown.split("\n").find((l) => l.trim().startsWith("#"));
  const title = (firstLine ?? `SOP: ${input.question}`).replace(/^#+\s*/, "").slice(0, 160).trim();
  const category = input.category ?? input.department ?? "Operations";

  const path = `${companyId}/${crypto.randomUUID()}-${title.replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}.md`;
  await getStorageProvider().put({
    bucket: "knowledge-docs",
    key: path,
    body: new TextEncoder().encode(markdown),
    contentType: "text/markdown",
  });

  const doc = await getKnowledgeRepository(ctx.supabase as never).insertDocument({
    company_id: companyId,
    title,
    category,
    doc_code: null,
    file_path: path,
    file_type: "text/markdown",
    uploaded_by: ctx.userId,
  } as never);

  // Index it so the assistant can ground answers on it immediately.
  try {
    const { processDocument } = await import("@/lib/doc-processing.server");
    await processDocument(doc.id, ctx.supabase as never);
  } catch {
    /* indexing retried by the KB pipeline */
  }

  const gapResolved = await closeGap(ctx, companyId, input.gapId, {
    resolution: "sop",
    resolved_document_id: doc.id,
  });

  return { kind: "sop", title, documentId: doc.id, gapResolved };
}

async function generateFaqArtefact(
  ctx: Ctx,
  companyId: string,
  input: RemediationInput,
): Promise<RemediationResult> {
  const context = await knowledgeContext(ctx, companyId);
  const system = `You write concise bilingual FAQ entries for an internal operations platform.
Answer in 2-5 sentences, operational and specific, no marketing tone.
Output strict JSON only: {"question_en":"...","question_de":"...","answer_en":"...","answer_de":"...","category":"..."}`;

  const raw = await llm(
    `Unanswered question from employees: "${input.question}"
Department: ${input.department ?? "Company-wide"}

Existing knowledge base:
${context}

Produce the FAQ entry JSON now.`,
    system,
  );

  const parsed = jsonFrom(raw) ?? {};
  const qEn = String(parsed["question_en"] ?? input.question).slice(0, 400);
  const qDe = String(parsed["question_de"] ?? qEn).slice(0, 400);
  const aEn = String(parsed["answer_en"] ?? "").slice(0, 4000);
  const aDe = String(parsed["answer_de"] ?? aEn).slice(0, 4000);
  if (!aEn.trim()) throw new Error("faq_generation_failed");

  const inserted = await getFaqRepository(ctx.supabase as never).insert(companyId, {
    question_en: qEn,
    question_de: qDe,
    answer_en: aEn,
    answer_de: aDe,
    category: String(parsed["category"] ?? input.category ?? input.department ?? "General"),
  });

  const gapResolved = await closeGap(ctx, companyId, input.gapId, {
    resolution: "faq",
    resolved_faq_id: inserted.id,
  });

  return { kind: "faq", title: qEn, faqId: inserted.id, gapResolved };
}

export async function remediateRecommendation(
  ctx: Ctx,
  companyId: string,
  input: RemediationInput,
): Promise<RemediationResult> {
  return input.kind === "sop"
    ? generateSopArtefact(ctx, companyId, input)
    : generateFaqArtefact(ctx, companyId, input);
}
