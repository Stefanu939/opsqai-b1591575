// Microsoft Teams bot webhook (public route — the caller is verified, never
// trusted). Registered in Entra/bot settings as the bot messaging endpoint.
//
// Inbound: Bot Framework activity POSTs, validated against Bot Framework's
// signing keys with the configured bot app id as audience. Outbound: replies
// through the Bot Framework Connector API. Answers are grounded in the company
// Knowledge Base exactly like AI Chat — never general knowledge.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getTeamsBotConfig,
  verifyBotFrameworkRequest,
  sendBotReply,
  answerFromKnowledge,
  botCompanyId,
} from "@/lib/microsoft/teams-bot.server";
import { detectLanguage } from "@/lib/chat-grounding";
import { mq } from "@/lib/microsoft/db.server";
import { isSelfHosted } from "@/lib/platform/mode";

const ActivitySchema = z.object({
  type: z.string().default("message"),
  text: z.string().optional().nullable(),
  serviceUrl: z.string().url().optional().nullable(),
  conversation: z.object({ id: z.string().min(1) }).optional().nullable(),
  from: z.object({ id: z.string().optional() }).optional().nullable(),
});

export const Route = createFileRoute("/api/public/teams")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Only a Self-Hosted installation answers Teams traffic; cloud and
        // public web never touch employee data.
        if (!isSelfHosted()) {
          return Response.json({ ok: false, error: "not_selfhosted" }, { status: 404 });
        }

        const config = getTeamsBotConfig();
        if (!config.enabled || !config.appId || !config.appSecret) {
          // Bot configured but disabled: acknowledge silently so Teams does
          // not retry with backoff.
          return new Response("ok", { status: 200 });
        }

        // Validate the Bot Framework token before reading any payload.
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        try {
          await verifyBotFrameworkRequest(auth.slice(7), config.appId);
        } catch (error) {
          console.error("[teams:auth]", error instanceof Error ? error.message : error);
          return new Response("Unauthorized", { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const parsed = ActivitySchema.safeParse(body);
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const activity = parsed.data;
        if (activity.type !== "message" || !activity.text?.trim() || !activity.serviceUrl || !activity.conversation) {
          return new Response("ok", { status: 200 });
        }

        const companyId = await botCompanyId();
        if (!companyId) return new Response("ok", { status: 200 });

        const language = detectLanguage(activity.text);
        try {
          const answer = await answerFromKnowledge(companyId, activity.text, language);
          await sendBotReply(config, {
            serviceUrl: activity.serviceUrl,
            conversationId: activity.conversation.id,
            text: answer.text,
            appOrigin: new URL(request.url).origin,
          });
          try {
            await mq(
              `INSERT INTO public.audit_log (actor_id, action, target, detail)
               VALUES (NULL, 'teams.bot_reply', $1, $2)`,
              [
                `conversation:${activity.conversation.id}`,
                JSON.stringify({
                  severity: "info",
                  success: true,
                  grounded: answer.grounded,
                  sources: answer.sourceCount,
                }),
              ],
            );
          } catch {
            /* audit must never break the reply */
          }
        } catch (error) {
          console.error("[teams:reply]", error);
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
