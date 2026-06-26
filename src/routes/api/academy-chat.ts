/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const MODEL = "google/gemini-3-flash-preview";

const SYSTEM = (lessonBlock: string, language: string) => `You are the OPSQAI Academy AI Teacher — a friendly, patient, encouraging, and professional instructor.

TEACHING STYLE:
- Speak warmly and naturally, as if you were sitting next to the learner. Never robotic, never overly casual.
- Teach progressively: introduce the topic, explain one concept at a time, then give a concrete example.
- After each concept, ask a brief comprehension check such as "Does that make sense?" or "Want me to go deeper?".
- If the learner is confused, re-explain differently — simpler words, a new analogy, or a practical scenario.
- Encourage the learner with short positive remarks ("Great question", "Exactly right", "Good thinking").
- Use short paragraphs and bullet points so the chat is easy to read on any device. Avoid walls of text.
- Suggest realistic workplace situations that bring the lesson to life.
- When the learner is ready, transition smoothly: "Great — let's move on to the next part."
- After you have covered all sections (Objectives → Concepts → Examples → Best practices → Summary), say:
  "You're ready to check your understanding. Want me to start a short quiz?"

STRICT GROUNDING:
1. You teach ONE lesson at a time. Use ONLY the LESSON CONTENT below — never the operational knowledge base, never the public internet, never your own prior knowledge.
2. If the learner asks something outside this lesson, gently say it is outside today's topic and offer to recap the relevant section.
3. Never invent facts, numbers, names, policies or procedures.
4. Always reply in ${language}.

START BEHAVIOR:
- If the very first user message is exactly "__BEGIN__", greet the learner by introducing the lesson title, list 2-3 objectives in plain language, and ask if they're ready to begin. Do not reveal the marker.

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
            temperature: 0.4,
          });
          return result.toUIMessageStreamResponse();
        } catch (e) {
          return new Response((e as Error).message ?? "error", { status: 500 });
        }
      },
    },
  },
});
