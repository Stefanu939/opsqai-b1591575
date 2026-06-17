import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const SYSTEM_PROMPT_BASE = `You are LogiAssist, an AI assistant specialized in logistics and warehouse operations.
You help warehouse employees with questions about:
- Inbound operations (Wareneingang) — goods receipt, quality checks, putaway
- Outbound operations (Warenausgang) — picking, packing, dispatch
- Loading and unloading procedures
- CMR documents and international road transport paperwork
- Warehouse processes and best practices
- Transport planning and route optimization
- Safety instructions (Arbeitssicherheit), PPE, hazardous goods (ADR)
- Internal company procedures

Be precise, practical, and concise. Use bullet points and numbered steps when explaining procedures.
If you don't know a company-specific procedure, say so and recommend checking the knowledge base or asking a supervisor.
Cite knowledge-base documents or FAQ entries when the user's question matches them.`;

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
        const language = body.language === "en" ? "en" : "de";

        if (!threadId) return new Response("threadId required", { status: 400 });

        // Verify thread ownership
        const { data: thread } = await supabase
          .from("threads")
          .select("id, title")
          .eq("id", threadId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        // Retrieve context: top FAQ + KB matches by simple keyword scoring
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const query =
          lastUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").toLowerCase() ?? "";

        let contextBlock = "";
        if (query) {
          const [{ data: faqs }, { data: docs }] = await Promise.all([
            supabase.from("faqs").select("question_de,question_en,answer_de,answer_en,category").limit(50),
            supabase.from("knowledge_documents").select("title,category,content_text").limit(50),
          ]);
          const score = (text: string) => {
            const t = text.toLowerCase();
            return query
              .split(/\s+/)
              .filter((w) => w.length > 3)
              .reduce((acc, w) => acc + (t.includes(w) ? 1 : 0), 0);
          };
          const topFaqs = (faqs ?? [])
            .map((f) => ({
              f,
              s: score(`${f.question_de} ${f.question_en} ${f.answer_de} ${f.answer_en}`),
            }))
            .filter((x) => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 3);
          const topDocs = (docs ?? [])
            .map((d) => ({ d, s: score(`${d.title} ${d.content_text}`) }))
            .filter((x) => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 3);

          if (topFaqs.length || topDocs.length) {
            contextBlock = "\n\nRelevant internal knowledge:\n";
            for (const { f } of topFaqs) {
              contextBlock += `\n[FAQ — ${f.category}]\nQ: ${language === "de" ? f.question_de : f.question_en}\nA: ${
                language === "de" ? f.answer_de : f.answer_en
              }\n`;
            }
            for (const { d } of topDocs) {
              contextBlock += `\n[Document — ${d.category}] ${d.title}\n${d.content_text.slice(0, 1200)}\n`;
            }
          }
        }

        const systemPrompt =
          SYSTEM_PROMPT_BASE +
          `\n\nRespond in ${language === "de" ? "German" : "English"} unless the user clearly writes in another language; then mirror their language.` +
          contextBlock;

        const gateway = createLovableAiGatewayProvider(apiKey);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: systemPrompt,
          messages: convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            // Persist new messages (user + assistant); use upsert by content hash isn't necessary; insert only new
            try {
              const { data: existing } = await supabase
                .from("messages")
                .select("id")
                .eq("thread_id", threadId);
              const existingCount = existing?.length ?? 0;
              const toInsert = finalMessages.slice(existingCount).map((m) => ({
                thread_id: threadId,
                user_id: userId,
                role: m.role as "user" | "assistant" | "system",
                content: m.parts
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("")
                  .slice(0, 100000),
                parts: m.parts as never,
              }));
              if (toInsert.length) {
                await supabase.from("messages").insert(toInsert);
              }
              // Update thread title from first user message if still default
              if (thread.title === "New conversation" || thread.title === "Neue Unterhaltung") {
                const firstUserText = finalMessages
                  .find((m) => m.role === "user")
                  ?.parts.map((p) => (p.type === "text" ? p.text : ""))
                  .join("")
                  .slice(0, 80);
                if (firstUserText) {
                  await supabase
                    .from("threads")
                    .update({ title: firstUserText, updated_at: new Date().toISOString() })
                    .eq("id", threadId);
                }
              } else {
                await supabase
                  .from("threads")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", threadId);
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
