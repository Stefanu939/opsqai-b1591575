/**
 * OPSQAI Assistant — answers questions about using the OPSQAI platform itself.
 *
 * Retrieves ONLY from System Knowledge (knowledge_documents.knowledge_type = 'system')
 * inside the OPSQAI Internal workspace. Never mixes customer documents.
 * Platform Owner / Platform Super Admin only.
 */
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { embedOne } from "@/lib/embeddings.server";
import type { Database } from "@/integrations/supabase/types";

const REFUSAL = "I can only answer questions about using OPSQAI. I could not find that in the platform documentation.";

const SYSTEM_PROMPT = (context: string, hasSources: boolean, langHint: string) => `You are the OPSQAI Assistant — the official in-product guide to the OPSQAI platform.

ABSOLUTE RULES:
1. Answer ONLY using the OPSQAI PLATFORM DOCUMENTATION below. No outside knowledge.
2. Scope: how to use OPSQAI itself (companies, users, knowledge, AI features, academy, tickets, admin, troubleshooting). NEVER answer customer-business questions; never mention customer data.
3. LANGUAGE: the user's current UI language is "${langHint}". Detect the language of their latest message; if it clearly differs from "${langHint}", reply in the message language, otherwise reply in "${langHint}". Always translate ALL prose, headings, the "Sources:" label and the refusal sentence into that language. Keep slugs, feature names, brand names and code identifiers unchanged. Supported languages include English, German (de), Romanian (ro), French (fr), Spanish (es), Italian (it), Polish (pl) and more — never refuse a language.
4. IF the answer is NOT explicitly supported by the documentation below, reply with ONE short sentence translated into the chosen reply language that means exactly: "${REFUSAL}" — and nothing else.
5. ${hasSources ? "Sources WERE retrieved; cite them." : "NO sources were retrieved. Reply with the refusal sentence."}
6. FORMAT when supported:
   - Concise direct answer (1–4 sentences or a tight list).
   - Then a "Sources:" block (translate the label, e.g. "Quellen:", "Surse:", "Sources :"), one line per source:
     "[<title>] — Section: <category> — Slug: <slug>"

OPSQAI PLATFORM DOCUMENTATION:
${context || "(No matching platform documentation was found.)"}`;

interface SourceItem { id: string; title: string; slug: string; category: string; excerpt: string; similarity: number }

export const Route = createFileRoute("/api/internal-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const apiKey = process.env.LOVABLE_API_KEY;
        const supaUrl = process.env.SUPABASE_URL;
        const supaKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !supaUrl || !supaKey) return new Response("Server misconfigured", { status: 500 });

        const supabase = createClient<Database>(supaUrl, supaKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });

        const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claims?.claims.sub) return new Response("Unauthorized", { status: 401 });
        const userId = claims.claims.sub;

        // Platform admin gate
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
        const isPlatformAdmin = (roles ?? []).some((r) => r.role === "platform_admin" || r.role === "platform_owner");
        if (!isPlatformAdmin) return new Response("Forbidden", { status: 403 });

        const body = await request.json() as { messages?: UIMessage[]; language?: string };
        const messages = body.messages ?? [];
        const langHint = body.language ?? "en";

        // Resolve the OPSQAI Internal company
        const { data: company } = await supabase.from("companies").select("id").eq("is_system", true).maybeSingle();
        if (!company) return new Response("OPSQAI Internal workspace missing", { status: 500 });
        const systemCompanyId = (company as { id: string }).id;

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const query = lastUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim() ?? "";

        const sources: SourceItem[] = [];
        let context = "";

        if (query) {
          try {
            const qVec = await embedOne(query);
            const { data: matches } = await supabase.rpc(
              "match_document_chunks_for_company" as never,
              {
                query_embedding: `[${qVec.join(",")}]`,
                match_count: 8,
                min_similarity: 0.15,
                _company_id: systemCompanyId,
              } as never,
            ) as { data: Array<{ chunk_id: string; document_id: string; doc_title: string; content: string; similarity: number }> | null };

            const list = matches ?? [];
            const docIds = Array.from(new Set(list.map((m) => m.document_id)));
            const meta: Record<string, { slug: string; category: string }> = {};
            if (docIds.length) {
              const { data: docs } = await supabase
                .from("knowledge_documents")
                .select("id, system_slug, category, knowledge_type")
                .in("id", docIds);
              for (const d of docs ?? []) {
                const row = d as { id: string; system_slug: string | null; category: string; knowledge_type: string };
                // Defense in depth: only system docs.
                if (row.knowledge_type !== "system" || !row.system_slug) continue;
                meta[row.id] = { slug: row.system_slug, category: row.category };
              }
            }

            for (const m of list) {
              const md = meta[m.document_id];
              if (!md) continue;
              sources.push({
                id: m.chunk_id,
                title: m.doc_title,
                slug: md.slug,
                category: md.category,
                excerpt: m.content,
                similarity: m.similarity,
              });
            }
            context = sources.map((s, i) =>
              `[Doc ${i + 1}] ${s.title} (${s.category}) — slug: ${s.slug}\n${s.excerpt}`,
            ).join("\n\n---\n\n");
          } catch (e) {
            console.error("[internal-chat] retrieval failed", e);
          }
        }

        const hasSources = sources.length > 0;
        const gateway = createLovableAiGatewayProvider(apiKey);

        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: hasSources ? SYSTEM_PROMPT(context, true, langHint) : SYSTEM_PROMPT("", false, langHint),
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          messageMetadata: ({ part }) => {
            if (part.type === "start") {
              return { sources, hasSources, langHint };
            }
            return undefined;
          },
        });
      },
    },
  },
});
