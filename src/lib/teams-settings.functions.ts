// Microsoft Teams bot settings (Self-Hosted only) — appended to the
// Microsoft 365 module. The bot answers questions in chats and channels from
// the company Knowledge Base, with the same grounding rules as AI Chat.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";

async function guard(context: { supabase: any; userId: string }) {
  await requirePlatformAdmin(context);
  const { isSelfHosted } = await import("@/lib/platform/mode");
  if (!isSelfHosted()) throw new Error("Microsoft 365 is available on Self-Hosted only.");
}

export const getTeamsSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guard(context);
    const { getTeamsBotConfig } = await import("@/lib/microsoft/teams-bot.server");
    const c = getTeamsBotConfig();
    return {
      appId: c.appId ?? "",
      hasSecret: Boolean(c.appSecret),
      enabled: Boolean(c.enabled),
      configured: Boolean(c.appId && c.appSecret),
    };
  });

export const saveTeamsSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        appId: z.string().trim().min(8).max(200),
        appSecret: z.string().max(500).optional(),
        enabled: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await guard(context);
    const { setTeamsBotConfig } = await import("@/lib/microsoft/teams-bot.server");
    setTeamsBotConfig({
      appId: data.appId,
      appSecret: data.appSecret?.trim() || undefined,
      enabled: data.enabled,
    });
    try {
      const { mq } = await import("@/lib/microsoft/db.server");
      await mq(
        `INSERT INTO public.audit_log (actor_id, action, target, detail)
         VALUES ($1, 'teams.settings_saved', 'teams_bot', $2)`,
        [context.userId, JSON.stringify({ severity: "warning", success: true, enabled: data.enabled })],
      );
    } catch {
      /* audit must never break saving */
    }
    return { ok: true };
  });

/** Probes the Bot Framework token endpoint — a real credential test. */
export const testTeamsBotConnection = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await guard(context);
    const { getTeamsBotConfig, isTeamsBotConfigured } = await import("@/lib/microsoft/teams-bot.server");
    const c = getTeamsBotConfig();
    if (!isTeamsBotConfigured(c)) return { ok: false, error: "Configure the bot app ID and secret first." };
    try {
      const res = await fetch("https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: c.appId!,
          client_secret: c.appSecret!,
          grant_type: "client_credentials",
          scope: "https://api.botframework.com/.default",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
      if (!res.ok || !json.access_token) {
        return { ok: false, error: json.error_description?.split("\r\n")[0] ?? `HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
