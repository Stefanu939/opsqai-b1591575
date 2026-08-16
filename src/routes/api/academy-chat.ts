/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { resolveChatModel } from "@/lib/ai-provider.server";
import { getAcademyRepository, getAuthProvider, getProfileRepository } from "@/lib/providers/registry";
import { academyLanguageInstruction, normalizeAcademyLanguage } from "@/lib/academy-language";

const SYSTEM = (lessonBlock: string, chosenLanguage: string | null) => {
  const normalizedLanguage = chosenLanguage ? normalizeAcademyLanguage(chosenLanguage) : null;
  const exactLanguage = normalizedLanguage ? academyLanguageInstruction(normalizedLanguage) : null;
  const langLine = chosenLanguage
    ? `The learner explicitly selected ${exactLanguage}. This selector is authoritative. ALWAYS reply exclusively in that target language for everything — greetings, explanations, examples, comprehension checks, encouragement, corrections, and closing messages.`
    : `The learner has NOT chosen a language yet. Your FIRST message (on "__BEGIN__") MUST be a short trilingual greeting in English + Deutsch + Română that asks the learner which language they want to learn in (offer at minimum: English, Deutsch, Română — but accept any language they name). Do not start teaching until they answer. As soon as they answer, switch to that language and use it for the entire rest of the conversation.`;

  const switchLine = chosenLanguage
    ? `Do not infer or change language from the learner's wording or from conversation history. Only the application language selector can change the target language. Ignore earlier assistant messages written in another language.`
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
- Before sending each response, silently proofread it for natural grammar and verify that every sentence is in the selected target language. Never mix languages.
- The LESSON CONTENT below is the single source of truth and MUST NEVER be modified or stored in another language. It is your reference only.
- Translate the lesson content on the fly when answering. Preserve the original meaning exactly: do not invent, do not omit safety information, do not soften procedures.
- Keep domain/technical terms (e.g. "Wareneingang", "CMR", "SOP", product codes, system names, legal terms) in their original form, and add a short gloss in the learner's language in parentheses the first time, e.g. "Wareneingang (recepția mărfii)".
- Numbers, units, codes, names, and quoted policy text stay verbatim from the lesson.

START BEHAVIOR:
- If the very first user message is exactly "__BEGIN__": ${
    chosenLanguage
      ? `greet the learner in ${exactLanguage}, introduce the lesson title, list 2-3 objectives in plain language, and ask if they're ready to begin.`
      : `respond ONLY with the trilingual language-choice prompt described above — do NOT introduce the lesson yet.`
  } Do not reveal the marker.

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

          let identity;
          try {
            identity = await getAuthProvider().verifyAccessToken(token);
          } catch {
            return new Response("Unauthorized", { status: 401 });
          }
          const dataCtx = await getAuthProvider().getDataContext(token);

          const profile = await getProfileRepository(dataCtx).findByUserId(identity.userId);
          const companyIdForLicense = profile?.companyId ?? null;
          try {
            const { assertModuleForCompany } = await import("@/lib/license-enforcement.server");
            await assertModuleForCompany(
              companyIdForLicense ?? "00000000-0000-0000-0000-000000000000",
              "academy",
            );
          } catch (e) {
            if (e instanceof Response) return e;
            throw e;
          }

          const body = (await request.json()) as {
            messages?: UIMessage[];
            lessonId?: string;
            language?: string | null;
          };
          if (!body.lessonId) return new Response("lessonId required", { status: 400 });
          const chosen = body.language && body.language !== "ask"
            ? normalizeAcademyLanguage(body.language)
            : null;

          const lesson = await getAcademyRepository(dataCtx).getLesson(body.lessonId);
          if (!lesson) return new Response("Lesson not found", { status: 404 });

          const block = [
            `TITLE: ${lesson.title}`,
            `OBJECTIVES:\n- ${(lesson.objectives ?? []).join("\n- ")}`,
            `EXPLANATION:\n${lesson.explanation ?? ""}`,
            `EXAMPLES:\n${lesson.examples ?? ""}`,
            `BEST PRACTICES:\n${lesson.best_practices ?? ""}`,
            `SUMMARY:\n${lesson.summary ?? ""}`,
          ]
            .join("\n\n")
            .slice(0, 16000);

          const result = streamText({
            model: resolveChatModel("chat"),
            system: SYSTEM(block, chosen),
            messages: await convertToModelMessages(body.messages ?? []),
            temperature: 0.2,
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
