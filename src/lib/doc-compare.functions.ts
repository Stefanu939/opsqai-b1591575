// Grounded document comparison for the OPSQAI chat workspace.
//
// The model only ever sees text that comes from the two selected company
// documents. When the excerpts do not cover the question, the answer says so
// instead of inventing content — same zero-hallucination rule as the chat.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requireModuleAccess } from "@/lib/module-access.server";
import { getActorRoles, getProfileCompany } from "@/lib/authorization";
import { getKnowledgeRepository } from "@/lib/providers/registry";
import { resolveChatModel } from "@/lib/ai-provider.server";
import { uuidString } from "@/lib/zod-uuid";

const Input = z.object({
  leftId: uuidString(),
  rightId: uuidString(),
  question: z.string().max(400).optional(),
  language: z.enum(["en", "de", "ro"]).default("en"),
  companyId: uuidString().nullable().optional(),
});

type Ctx = { supabase: unknown; userId: string };

const REFUSAL: Record<"en" | "de" | "ro", string> = {
  en: "The two documents do not contain enough text to compare this reliably.",
  de: "Die beiden Dokumente enthalten nicht genug Text für einen verlässlichen Vergleich.",
  ro: "Cele două documente nu conțin suficient text pentru o comparație de încredere.",
};

/** Documents the caller may read, for the picker and its search box. */
export const listComparableDocuments = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ companyId: uuidString().nullable().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "kb");
    const ctx = context as unknown as Ctx;
    const repo = getKnowledgeRepository(ctx.supabase as never);
    const actor = await getActorRoles(ctx.supabase as never, ctx.userId);
    const companyId =
      (actor.isPlatformAdmin && data.companyId) ||
      (await getProfileCompany(ctx.supabase as never, ctx.userId));
    const rows = (await repo.listDocuments(companyId ?? null, false)) as unknown as Array<
      Record<string, unknown>
    >;
    return rows.map((r) => ({
      id: String(r["id"]),
      title: String(r["title"] ?? ""),
      docCode: (r["doc_code"] as string | null) ?? null,
      category: (r["category"] as string | null) ?? null,
      updatedAt: (r["updated_at"] as string | null) ?? null,
    }));
  });

export const compareDocuments = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    await requireModuleAccess(context, "kb");
    const ctx = context as unknown as Ctx;
    if (data.leftId === data.rightId) throw new Error("Pick two different documents.");
    const repo = getKnowledgeRepository(ctx.supabase as never);
    const actor = await getActorRoles(ctx.supabase as never, ctx.userId);
    const companyId =
      (actor.isPlatformAdmin && data.companyId) ||
      (await getProfileCompany(ctx.supabase as never, ctx.userId));

    // Only documents in the caller's own library may be compared.
    const allowed = new Set(
      (
        (await repo.listDocuments(companyId ?? null, false)) as unknown as Array<
          Record<string, unknown>
        >
      ).map(
        (r) => String(r["id"]),
      ),
    );
    if (!allowed.has(data.leftId) || !allowed.has(data.rightId)) {
      throw new Error("Document not available in this workspace.");
    }

    const meta = await repo.getDocumentsByIds([data.leftId, data.rightId]);
    const title = (id: string) => meta.find((m) => m.id === id)?.title ?? id;
    const [left, right] = await Promise.all([
      repo.getChunksContent(data.leftId, 60),
      repo.getChunksContent(data.rightId, 60),
    ]);
    const leftText = left.join("\n").slice(0, 24_000).trim();
    const rightText = right.join("\n").slice(0, 24_000).trim();
    if (leftText.length < 80 || rightText.length < 80) {
      return {
        grounded: false,
        answer: REFUSAL[data.language],
        left: { id: data.leftId, title: title(data.leftId) },
        right: { id: data.rightId, title: title(data.rightId) },
      };
    }

    const { generateText } = await import("ai");
    const system = `You compare two internal company documents for a manager.
Rules:
- Use ONLY the two excerpts provided. Never add outside knowledge, examples or assumptions.
- Answer in ${data.language.toUpperCase()} only, with correct spelling and diacritics.
- Structure: "Same", "Different", "Only in A", "Only in B", "Management view" (max 3 short bullets each).
- If the excerpts do not cover something, write that it is not covered instead of guessing.
- Plain text with short bullets, no preamble.`;
    const prompt = `Question: ${data.question?.trim() || "Compare both documents for a manager."}

=== DOCUMENT A: ${title(data.leftId)} ===
${leftText}

=== DOCUMENT B: ${title(data.rightId)} ===
${rightText}`;

    const { text } = await generateText({
      model: resolveChatModel("chat"),
      temperature: 0.1,
      system,
      prompt,
    });
    const answer = text.trim();
    return {
      grounded: answer.length > 0,
      answer: answer || REFUSAL[data.language],
      left: { id: data.leftId, title: title(data.leftId) },
      right: { id: data.rightId, title: title(data.rightId) },
    };
  });
