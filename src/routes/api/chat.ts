import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { embedOne } from "@/lib/embeddings.server";
import type { Database } from "@/integrations/supabase/types";

const SYSTEM_PROMPT = (lang: "de" | "en", context: string) => `You are LogiAI, an AI knowledge assistant for a logistics and warehouse operations company.

STRICT RULES — non-negotiable:
1. Answer ONLY from the "COMPANY KNOWLEDGE" provided below. The Knowledge Base (SOPs, manuals, procedures) and FAQs are the SINGLE SOURCE OF TRUTH.
2. NEVER use general LLM knowledge to answer about company procedures, processes, safety, or operations.
3. NEVER invent procedures, role names, time limits, escalation paths, or document codes.
4. If the answer is not present in COMPANY KNOWLEDGE, respond exactly:
   ${lang === "de"
     ? '"Die angeforderte Information ist nicht in der aktuellen Firmen-Wissensdatenbank oder in den FAQs verfügbar."'
     : '"The requested information is not available in the current company Knowledge Base or FAQs."'}
   Then suggest the user contact a supervisor.
5. Reason carefully: if a SOP says ">60 min triggers X", and the user asks about 75 min, you MUST apply the rule (75 > 60).
6. Always cite your sources at the end in this exact format:

${lang === "de" ? "Quellen:" : "Sources:"}
- [DOC-CODE or Document Title] — short section reference
- [FAQ: question summary]

Respond in ${lang === "de" ? "German" : "English"} unless the user clearly writes in another language; then mirror their language.

COMPANY KNOWLEDGE:
${context || (lang === "de" ? "(Keine passenden Dokumente gefunden.)" : "(No matching documents found.)")}`;

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
          language?: "de" | "en";
        };
        const messages = body.messages ?? [];
        const threadId = body.threadId;
        const language: "de" | "en" = body.language === "en" ? "en" : "de";
        if (!threadId) return new Response("threadId required", { status: 400 });

        const { data: thread } = await supabase
          .from("threads").select("id, title").eq("id", threadId).eq("user_id", userId).maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const query = lastUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim() ?? "";

        // === RAG: Semantic retrieval ===
        const sources: SourceItem[] = [];
        let contextBlock = "";

        if (query) {
          try {
            const qVec = await embedOne(query);
            const { data: matches } = await supabase.rpc("match_document_chunks", {
              query_embedding: `[${qVec.join(",")}]` as unknown as string,
              match_count: 6,
              min_similarity: 0.3,
            });
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

          // FAQ keyword fallback (small dataset, no need to embed)
          const { data: faqs } = await supabase
            .from("faqs").select("id,question_de,question_en,answer_de,answer_en,category").limit(100);
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
              title: language === "de" ? f.question_de : f.question_en,
              excerpt: language === "de" ? f.answer_de : f.answer_en,
            });
          }

          // Build context block
          const docBlocks = sources.filter((s) => s.type === "document").map((s, i) =>
            `[Doc ${i + 1}] ${s.code ? s.code + " — " : ""}${s.title}\n${s.excerpt}`,
          );
          const faqBlocks = sources.filter((s) => s.type === "faq").map((s, i) =>
            `[FAQ ${i + 1}] ${s.title}\nA: ${s.excerpt}`,
          );
          contextBlock = [...docBlocks, ...faqBlocks].join("\n\n---\n\n");
        }

        const gateway = createLovableAiGatewayProvider(apiKey);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT(language, contextBlock),
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          messageMetadata: ({ part }) => {
            if (part.type === "start") {
              return { sources };
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
                  thread_id: threadId,
                  question: q.slice(0, 2000),
                  answer_preview: a.slice(0, 500),
                  sources: sources as unknown as never,
                });
              }

              if (thread.title === "New conversation" || thread.title === "Neue Unterhaltung") {
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
