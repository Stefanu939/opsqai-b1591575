import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { embedOne } from "@/lib/embeddings.server";
import type { Database } from "@/integrations/supabase/types";

const REFUSAL = {
  en: "The requested information is not available in the current company Knowledge Base or FAQs.",
  de: "Die angeforderte Information ist in der aktuellen Wissensdatenbank oder den FAQs des Unternehmens nicht verfügbar.",
  ro: "Informația solicitată nu este disponibilă în Baza de Cunoștințe sau FAQ-urile companiei.",
} as const;

const GREETING_PATTERNS = [
  /^(hi|hello|hey|hiya|yo|howdy|good\s*(morning|afternoon|evening|day)|thanks|thank\s+you|thx|ty|cheers|bye|goodbye|see\s+ya)\b/i,
  /^(hallo|hi|hey|guten\s*(morgen|tag|abend)|servus|moin|danke|tsch[üu]ss|auf\s+wiedersehen)\b/i,
  /^(salut|bun[ăa]|bun[ăa]\s+(ziua|dimineața|seara)|noroc|mul[țt]umesc|mersi|pa|la\s+revedere)\b/i,
  /^(who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do|how\s+are\s+you)\b/i,
  /^(wer\s+bist\s+du|was\s+kannst\s+du|wie\s+geht'?s)\b/i,
  /^(cine\s+e[șs]ti|ce\s+po[țt]i\s+face|ce\s+faci)\b/i,
];

function detectGreeting(q: string): boolean {
  const trimmed = q.trim();
  if (trimmed.length === 0 || trimmed.length > 80) return false;
  return GREETING_PATTERNS.some((re) => re.test(trimmed));
}

const FOLLOWUP_PATTERNS = [
  /\b(elaborate|explain|explain (it|that|more)|tell me more|more detail|more details|give (me )?more details|expand|clarify|summari[sz]e|tl;?dr|in short|shorter|translate|in (english|german|romanian|deutsch|englisch|rom[âa]n[ăa]|german[ăa]|englez[ăa])|rephrase|simpler|simplify|continue|go on|and\??|why\??|how\??|what about|details?\??)\b/i,
  /\b(erkl[äa]re|erl[äa]utere|mehr details?|ausf[üu]hrlicher|zusammenfassen|[üu]bersetze|fortfahren|weiter|warum\??|wie\??)\b/i,
  /\b(elaboreaz[ăa]|explic[ăa]|mai multe detalii|detalia[zț]i|rezum[ăa]|traduce[țt]i|continu[ăa]|de ce\??|cum\??)\b/i,
];

function detectFollowup(q: string): boolean {
  const trimmed = q.trim();
  if (trimmed.length === 0 || trimmed.length > 160) return false;
  return FOLLOWUP_PATTERNS.some((re) => re.test(trimmed));
}

const FOLLOWUP_PROMPT = (context: string) => `You are OPSQAI, an AI knowledge assistant for a logistics and warehouse operations company.

The user is asking a FOLLOW-UP question about the previous answer (e.g. elaborate, explain, summarize, translate, more details). Do NOT search for new information. Re-use the conversation so far AND the previously retrieved sources below to answer.

ABSOLUTE RULES:
1. Use ONLY information from the prior conversation and the "PREVIOUSLY RETRIEVED SOURCES" block below. No outside knowledge.
2. Detect the user's language (English, German, or Romanian) and answer in that language. If they asked to translate, translate the prior answer into the requested language.
3. If the requested information is genuinely not present in either the conversation context or the sources below, reply with exactly:
   - English: "${REFUSAL.en}"
   - German: "${REFUSAL.de}"
   - Romanian: "${REFUSAL.ro}"
4. When you do answer, end with a "Sources:" / "Quellen:" / "Surse:" block reusing the same sources you relied on, in the same format as before.

PREVIOUSLY RETRIEVED SOURCES:
${context || "(No previously retrieved sources are available.)"}`;

const GREETING_PROMPT = (lang: string) => `You are OPSQAI, a professional company knowledge assistant for logistics and warehouse operations.

The user has greeted you or asked a conversational question. Respond naturally, briefly (1–3 sentences), and professionally in their language (English, German, or Romanian — detect from the user message). Introduce yourself as their company knowledge assistant that can help find SOPs, procedures, FAQs and company information. Do NOT include any "Sources:" block. Do NOT make up company facts.

User's interface language hint: ${lang}.`;


const SYSTEM_PROMPT = (context: string, hasSources: boolean) => `You are OPSQAI, an AI knowledge assistant for a logistics and warehouse operations company.

ABSOLUTE RULES — non-negotiable, never break:
1. SOURCE-GROUNDED ONLY. You may ONLY use information explicitly written in the "COMPANY KNOWLEDGE" block below. The Knowledge Base (SOPs, manuals, procedures) and FAQs are the SINGLE SOURCE OF TRUTH.
2. NO assumptions, NO guessing, NO procedural inference, NO general world knowledge about logistics, safety, escalation, roles, or time limits. If it is not literally in the sources, it does not exist.
3. NEVER invent role names, escalation paths, time limits, contacts, document codes, or company rules. Do not paraphrase rules in a way that changes their meaning or adds steps.
4. Direct rule application IS allowed (e.g. if the source says ">60 min → notify manager" and the user asks about 75 min, apply the rule because 75 > 60). But do NOT add any consequence the source does not state.
5. IF the answer is NOT explicitly present or NOT clearly supported by the sources below, you MUST reply with exactly this sentence and NOTHING ELSE (no apology, no speculation, no extra context):
   - English: "${REFUSAL.en}"
   - German: "${REFUSAL.de}"
   - Romanian: "${REFUSAL.ro}"
6. LANGUAGE: Detect the user's language (English, German, or Romanian) and ALWAYS answer in that exact language, regardless of the source language. Translate source facts into the user's language; keep document codes and proper nouns unchanged.
7. FORMAT when an answer IS supported:
   - Give a concise, direct answer first (1–4 short sentences or a tight bullet list).
   - Then a "Sources:" / "Quellen:" / "Surse:" block listing each source as:
     "[DOC-CODE or Title] — Section: <section name or '—'> — Confidence: <high|medium|low> — Excerpt: \\"<short verbatim quote from the source, ≤200 chars>\\""
   - Confidence: high = exact rule quoted; medium = directly implied by quoted text; low = related but partial — in "low" cases prefer the refusal sentence instead.
8. ${hasSources ? "Sources WERE retrieved; evaluate them carefully before answering." : "NO sources were retrieved for this question. You MUST reply with the refusal sentence in the user's language."}

COMPANY KNOWLEDGE:
${context || "(No matching company documents or FAQs were found for this question.)"}`;

interface SourceItem {
  type: "document" | "faq";
  id: string;
  title: string;
  code?: string | null;
  excerpt: string;
  similarity?: number;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const apiKey = process.env.LOVABLE_API_KEY;
        const supaUrl = process.env.SUPABASE_URL;
        const supaKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !supaUrl || !supaKey) {
          return new Response("Server misconfigured", { status: 500 });
        }

        const supabase = createClient<Database>(supaUrl, supaKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });

        const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claims?.claims.sub) return new Response("Unauthorized", { status: 401 });
        const userId = claims.claims.sub;

        const body = (await request.json()) as {
          messages?: UIMessage[];
          threadId?: string;
          language?: string;
        };
        const messages = body.messages ?? [];
        const threadId = body.threadId;
        const langHint = body.language ?? "en";
        if (!threadId) return new Response("threadId required", { status: 400 });

        const { data: thread } = await supabase
          .from("threads")
          .select("id, title, company_id")
          .eq("id", threadId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });
        const companyId = thread.company_id;

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const query = lastUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim() ?? "";

        const isGreeting = detectGreeting(query);
        const sources: SourceItem[] = [];
        let contextBlock = "";
        let mode: "greeting" | "kb" | "gap" = isGreeting ? "greeting" : "kb";

        if (!isGreeting && query) {
          try {
            const qVec = await embedOne(query);
            const { data: matches } = await supabase.rpc(
              "match_document_chunks_for_company" as never,
              {
                query_embedding: `[${qVec.join(",")}]`,
                match_count: 6,
                min_similarity: 0.3,
                _company_id: companyId,
              } as never,
            ) as { data: Array<{ chunk_id: string; doc_title: string; doc_code: string | null; content: string; similarity: number }> | null };
            for (const m of matches ?? []) {
              sources.push({
                type: "document",
                id: m.chunk_id,
                title: m.doc_title,
                code: m.doc_code,
                excerpt: m.content,
                similarity: m.similarity,
              });
            }
          } catch (e) {
            console.error("embed/match failed", e);
          }

          const { data: faqs } = await supabase
            .from("faqs")
            .select("id,question_de,question_en,answer_de,answer_en,category")
            .limit(200);
          const lq = query.toLowerCase();
          const words = lq.split(/\s+/).filter((w) => w.length > 3);
          const scored = (faqs ?? [])
            .map((f) => {
              const blob = `${f.question_de} ${f.question_en} ${f.answer_de} ${f.answer_en}`.toLowerCase();
              const s = words.reduce((acc, w) => acc + (blob.includes(w) ? 1 : 0), 0);
              return { f, s };
            })
            .filter((x) => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 3);
          for (const { f } of scored) {
            sources.push({
              type: "faq",
              id: f.id,
              title: `${f.question_en} / ${f.question_de}`,
              excerpt: `EN: ${f.answer_en}\nDE: ${f.answer_de}`,
            });
          }

          const docBlocks = sources.filter((s) => s.type === "document").map((s, i) =>
            `[Doc ${i + 1}] ${s.code ? s.code + " — " : ""}${s.title}\n${s.excerpt}`,
          );
          const faqBlocks = sources.filter((s) => s.type === "faq").map((s, i) =>
            `[FAQ ${i + 1}] ${s.title}\n${s.excerpt}`,
          );
          contextBlock = [...docBlocks, ...faqBlocks].join("\n\n---\n\n");
          if (sources.length === 0) mode = "gap";
        }

        const gateway = createLovableAiGatewayProvider(apiKey);
        const systemPrompt = isGreeting
          ? GREETING_PROMPT(langHint)
          : SYSTEM_PROMPT(contextBlock, sources.length > 0);

        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: systemPrompt,
          messages: await convertToModelMessages(messages),
        });

        const canCreateRequest = mode === "gap";

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          messageMetadata: ({ part }) => {
            if (part.type === "start") {
              return { sources, mode, canCreateRequest, question: query };
            }
            return undefined;
          },
          onFinish: async ({ messages: finalMessages }) => {
            try {
              const { data: existing } = await supabase
                .from("messages").select("id").eq("thread_id", threadId);
              const existingCount = existing?.length ?? 0;
              const newMessages = finalMessages.slice(existingCount);
              const toInsert = newMessages.map((m) => ({
                thread_id: threadId,
                user_id: userId,
                company_id: companyId,
                role: m.role as "user" | "assistant" | "system",
                content: m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").slice(0, 100000),
                parts: m.parts as never,
                sources: m.role === "assistant" ? (sources as unknown as never) : null,
              }));
              if (toInsert.length) await supabase.from("messages").insert(toInsert);

              // Audit log
              const lastUserMsg = newMessages.find((m) => m.role === "user");
              const lastAsstMsg = newMessages.find((m) => m.role === "assistant");
              if (lastUserMsg) {
                const q = lastUserMsg.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                const a = lastAsstMsg?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
                await supabase.from("audit_log").insert({
                  user_id: userId,
                  company_id: companyId,
                  thread_id: threadId,
                  question: q.slice(0, 2000),
                  answer_preview: a.slice(0, 500),
                  sources: sources as unknown as never,
                });
              }

              if (thread.title === "New conversation" || thread.title === "Neue Unterhaltung" || thread.title === "Conversație nouă") {
                const firstUserText = finalMessages.find((m) => m.role === "user")
                  ?.parts.map((p) => (p.type === "text" ? p.text : "")).join("").slice(0, 80);
                if (firstUserText) {
                  await supabase.from("threads")
                    .update({ title: firstUserText, updated_at: new Date().toISOString() }).eq("id", threadId);
                }
              } else {
                await supabase.from("threads")
                  .update({ updated_at: new Date().toISOString() }).eq("id", threadId);
              }
            } catch (e) {
              console.error("persist messages failed", e);
            }
          },
        });
      },
    },
  },
});
