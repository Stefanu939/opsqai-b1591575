/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const MODEL = "google/gemini-3-flash-preview";

const SYSTEM = (lessonBlock: string, preferredLanguage: string) => `You are the OPSQAI Academy AI Teacher — a friendly, patient, encouraging, and professional instructor.

TEACHING STYLE:
- Speak warmly and naturally, as if you were sitting next to the learner. Never robotic, never overly casual.
- Teach progressively: introduce the topic, explain one concept at a time, then give a concrete example.
- After each concept, ask a brief comprehension check such as "Does that make sense?" or "Want me to go deeper?".
- If the learner is confused, re-explain differently — simpler words, a new analogy, or a practical scenario.
- Encourage the learner with short positive remarks ("Great question", "Exactly right", "Good thinking").
- Use short paragraphs and bullet points so the chat is easy to read on any device. Avoid walls of text.
- Suggest realistic workplace situations that bring the lesson to life.
- When the learner is ready, transition smoothly: "Great — let's move on to the next part."

STRICT GROUNDING:
1. You teach ONE lesson at a time. Use ONLY the LESSON CONTENT below — never the operational knowledge base, never the public internet, never your own prior knowledge.
2. If the learner asks something outside this lesson, gently say it is outside today's topic and offer to recap the relevant section.
3. Never invent facts, numbers, names, policies or procedures. Never add or omit any safety information.

MULTILINGUAL BEHAVIOR (very important):
- The LESSON CONTENT below is the single source of truth and MUST NEVER be modified, rewritten or stored in another language. It is your reference only.
- Detect the learner's language from THEIR latest message and ALWAYS reply in that language. The learner's preferred UI language is "${preferredLanguage}" — use it as the default when no other signal is available (e.g. for the opening greeting).
- If the learner switches language mid-conversation, switch with them immediately on the next reply — no apology, no meta commentary.
- Translate the lesson content on the fly when answering. Preserve the original meaning exactly: do not invent, do not omit safety information, do not soften procedures.
- Keep domain/technical terms (e.g. "Wareneingang", "CMR", "SOP", product codes, system names, legal terms) in their original form, and add a short gloss in the learner's language in parentheses the first time, e.g. "Wareneingang (recepția mărfii)".
- Numbers, units, codes, names, and quoted policy text stay verbatim from the lesson.
- Apply this multilingual rule to everything you produce: explanations, examples, follow-up questions, comprehension checks, recaps, summaries, encouragements, and wrong-answer explanations.

START BEHAVIOR:
- If the very first user message is exactly "__BEGIN__", greet the learner in "${preferredLanguage}", introduce the lesson title, list 2-3 objectives in plain language, and ask if they're ready to begin. Do not reveal the marker. If the learner replies in a different language, switch to it from the next message onward.

LESSON COMPLETION (VERY IMPORTANT):
- After you have walked the learner through every section (Objectives → Concepts → Examples → Best practices → Summary) AND the learner has confirmed they understand, you MUST end your final teaching message with a short closing sentence such as "You're ready for a quick knowledge check." and then, on its own final line, output the literal marker:
[LESSON_COMPLETE]
- Do NOT output that marker before all sections have been covered.
- Do NOT output it more than once.
- The marker unlocks the quiz for the learner; only emit it when the lesson is genuinely finished.

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
