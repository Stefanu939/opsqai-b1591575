/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

const MODEL = "google/gemini-3-flash-preview";

const LANG_LABEL: Record<string, string> = {
  en: "English", de: "German (Deutsch)", ro: "Romanian (Română)",
  fr: "French (Français)", es: "Spanish (Español)", it: "Italian (Italiano)",
  pt: "Portuguese (Português)", pl: "Polish (Polski)", uk: "Ukrainian (Українська)",
};

const SYSTEM = (lessonBlock: string, chosenLanguage: string | null) => {
  const langLine = chosenLanguage
    ? `The learner has explicitly chosen to learn in ${LANG_LABEL[chosenLanguage] ?? chosenLanguage}. ALWAYS reply in that language for everything — greetings, explanations, examples, comprehension checks, encouragements, wrong-answer explanations, and the closing message.`
    : `The learner has NOT chosen a language yet. Your FIRST message (on "__BEGIN__") MUST be a short trilingual greeting in English + Deutsch + Română that asks the learner which language they want to learn in (offer at minimum: English, Deutsch, Română — but accept any language they name). Do not start teaching until they answer. As soon as they answer, switch to that language and use it for the entire rest of the conversation.`;

  const switchLine = chosenLanguage
    ? `If the learner asks to switch language mid-conversation (e.g. "please continue in French"), switch on the next reply and stay in the new language for everything that follows — no apology, no meta commentary.`
    : `As soon as the learner picks a language (either by naming it or by writing in it), switch to it and use it for the entire rest of the conversation.`;

  return `You are the OPSQAI Academy AI Teacher — a friendly, patient, encouraging, and professional instructor.

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

LANGUAGE (very important):
- ${langLine}
- ${switchLine}
- The LESSON CONTENT below is the single source of truth and MUST NEVER be modified or stored in another language. It is your reference only.
- Translate the lesson content on the fly when answering. Preserve the original meaning exactly: do not invent, do not omit safety information, do not soften procedures.
- Keep domain/technical terms (e.g. "Wareneingang", "CMR", "SOP", product codes, system names, legal terms) in their original form, and add a short gloss in the learner's language in parentheses the first time, e.g. "Wareneingang (recepția mărfii)".
- Numbers, units, codes, names, and quoted policy text stay verbatim from the lesson.

START BEHAVIOR:
- If the very first user message is exactly "__BEGIN__": ${chosenLanguage
    ? `greet the learner in ${LANG_LABEL[chosenLanguage] ?? chosenLanguage}, introduce the lesson title, list 2-3 objectives in plain language, and ask if they're ready to begin.`
    : `respond ONLY with the trilingual language-choice prompt described above — do NOT introduce the lesson yet.`} Do not reveal the marker.

LESSON COMPLETION (VERY IMPORTANT):
- After you have walked the learner through every section (Objectives → Concepts → Examples → Best practices → Summary) AND the learner has confirmed they understand, you MUST end your final teaching message with a short closing sentence such as "You're ready for a quick knowledge check." and then, on its own final line, output the literal marker:
[LESSON_COMPLETE]
- Do NOT output that marker before all sections have been covered.
- Do NOT output it more than once.
- The marker unlocks the quiz for the learner; only emit it when the lesson is genuinely finished.

LESSON CONTENT:
${lessonBlock}`;
};

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

          const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
          if (claimsErr || !claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });

          const body = await request.json() as { messages?: UIMessage[]; lessonId?: string; language?: string | null };
          if (!body.lessonId) return new Response("lessonId required", { status: 400 });
          const chosen = body.language && body.language !== "ask" ? body.language : null;

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
            system: SYSTEM(block, chosen),
            messages: await convertToModelMessages(body.messages ?? []),
            temperature: 0.4,
          });
          return result.toUIMessageStreamResponse();
        } catch (e) {
          console.error("[academy-chat] internal error", e);
          return new Response("AI service temporarily unavailable.", { status: 500 });
        }
      },
    },
  },
});
