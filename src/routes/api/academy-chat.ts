/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const MODEL = "google/gemini-3-flash-preview";

const SYSTEM = (lessonBlock: string, language: string) => `You are the OPSQAI Academy AI Tutor.

CORE RULES:
1. You teach ONE lesson at a time. Use ONLY the LESSON CONTENT below.
2. Never use the operational knowledge base. Never invent facts.
3. If asked something outside this lesson, gently say it is outside the lesson and offer to recap a section.
4. Reply in ${language}. Be warm, clear, concise. Use bullet points and short paragraphs.

LESSON CONTENT:
${lessonBlock}`;

export const Route = createFileRoute("/api/academy-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = request.headers.get("authorization")?.replace("Bearer ", "");
          if (!token) return new Response("Unauthorized", { status: 401 });
          const apiKey = process.env.LOVABLE_API_KEY;
          const supaUrl = process.env.SUPABASE_URL;
          const supaKey = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!apiKey || !supaUrl || !supaKey) return new Response("Server misconfigured", { status: 500 });

          const supabase = createClient<Database>(supaUrl, supaKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          });

          const body = await request.json() as { messages?: UIMessage[]; lessonId?: string; language?: string };
          if (!body.lessonId) return new Response("lessonId required", { status: 400 });
          const language = body.language ?? "en";

          const { data: lesson } = await (supabase as any).from("academy_lessons")
            .select("title, objectives, explanation, examples, best_practices, summary")
            .eq("id", body.lessonId).maybeSingle();
          if (!lesson) return new Response("Lesson not found", { status: 404 });

          const block = [
            `TITLE: ${lesson.title}`,
            `OBJECTIVES:\n- ${(lesson.objectives ?? []).join("\n- ")}`,
            `EXPLANATION:\n${lesson.explanation ?? ""}`,
            `EXAMPLES:\n${lesson.examples ?? ""}`,
            `BEST PRACTICES:\n${lesson.best_practices ?? ""}`,
            `SUMMARY:\n${lesson.summary ?? ""}`,
          ].join("\n\n").slice(0, 16000);

          const gateway = createLovableAiGatewayProvider(apiKey);
          const result = streamText({
            model: gateway(MODEL),
            system: SYSTEM(block, language),
            messages: await convertToModelMessages(body.messages ?? []),
            temperature: 0.3,
          });
          return result.toUIMessageStreamResponse();
        } catch (e) {
          return new Response((e as Error).message ?? "error", { status: 500 });
        }
      },
    },
  },
});
