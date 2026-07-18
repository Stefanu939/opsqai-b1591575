/**
 * Live Slack / Teams notifications for OPSQAI events.
 *
 * Uses incoming-webhook URLs stored per-company in `company_integrations.config`:
 *   { webhook_url: string, events: string[] }
 *
 * Zero secrets in code; the customer pastes their webhook URL themselves.
 * All server fns are auth-gated to the active company's members.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";

import { getProfileCompany } from "@/lib/authorization";
import { getIntegrationRepository } from "@/lib/providers/registry";

/** Events any admin can opt into. Keep in sync with UI catalog. */
export const NOTIFICATION_EVENTS = [
  "sop.published",
  "incident.opened",
  "user.provisioned",
  "audit.critical",
  "chat.flagged",
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

type Provider = "slack" | "teams";
type Config = { webhook_url?: string; events?: NotificationEvent[] };

/* ------------------------------------------------------------------ */
/* Payload adapters                                                   */
/* ------------------------------------------------------------------ */

function slackPayload(event: string, title: string, body: string) {
  return {
    text: `*${title}*\n${body}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: title } },
      { type: "section", text: { type: "mrkdwn", text: body } },
      { type: "context", elements: [{ type: "mrkdwn", text: `OPSQAI · \`${event}\`` }] },
    ],
  };
}

function teamsPayload(event: string, title: string, body: string) {
  return {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    themeColor: "0F172A",
    summary: title,
    sections: [{ activityTitle: title, activitySubtitle: `OPSQAI · ${event}`, text: body }],
  };
}

async function postWebhook(
  provider: Provider,
  url: string,
  event: string,
  title: string,
  body: string,
) {
  const payload =
    provider === "slack" ? slackPayload(event, title, body) : teamsPayload(event, title, body);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, body: text.slice(0, 500) };
  } catch (e) {
    return { ok: false, status: 0, body: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timeout);
  }
}

/* ------------------------------------------------------------------ */
/* Server fns                                                          */
/* ------------------------------------------------------------------ */

const ProviderSchema = z.enum(["slack", "teams"]);

async function actorCompany(ctx: { supabase: unknown; userId: string }): Promise<string> {
  const id = await getProfileCompany(ctx.supabase, ctx.userId);
  if (!id) throw new Error("No active company");
  return id;
}

export const getNotificationConfig = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ provider: ProviderSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const companyId = await actorCompany(context);
    const row = await getIntegrationRepository(context.supabase).find(
      companyId,
      data.provider,
    );
    const cfg = (row?.config ?? {}) as Config;
    return {
      status: row?.status ?? "disconnected",
      webhook_url: cfg.webhook_url ?? "",
      events: (cfg.events ?? []) as NotificationEvent[],
      connected_at: row?.connectedAt ?? null,
      last_error: row?.lastError ?? null,
    };
  });

const SaveInput = z.object({
  provider: ProviderSchema,
  webhook_url: z.string().url().max(2048),
  events: z.array(z.enum(NOTIFICATION_EVENTS)).max(20),
});

export const saveNotificationConfig = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    // Constrain host to the provider's official webhook domain — prevents
    // a compromised session from turning this into an open proxy.
    const host = new URL(data.webhook_url).hostname.toLowerCase();
    if (data.provider === "slack" && !host.endsWith("hooks.slack.com")) {
      throw new Error("Slack webhook must be on hooks.slack.com");
    }
    if (data.provider === "teams") {
      const ok = host === "webhook.office.com" || host.endsWith(".webhook.office.com");
      if (!ok) throw new Error("Teams webhook must be on *.webhook.office.com");
    }

    const companyId = await actorCompany(context);
    const config: Config = { webhook_url: data.webhook_url, events: data.events };
    await getIntegrationRepository(context.supabase).upsert({
      companyId,
      provider: data.provider,
      status: "connected",
      config: config as Record<string, unknown>,
      connectedAt: new Date().toISOString(),
      connectedBy: context.userId,
    });
    return { ok: true };
  });

export const testNotification = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ provider: ProviderSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const companyId = await actorCompany(context);
    const repo = getIntegrationRepository(context.supabase);
    const row = await repo.find(companyId, data.provider);
    const url = ((row?.config ?? {}) as Config).webhook_url;
    if (!url) throw new Error("No webhook URL configured");

    const result = await postWebhook(
      data.provider,
      url,
      "notification.test",
      "OPSQAI test notification",
      "If you can see this, live notifications are wired up correctly.",
    );

    await repo.update(companyId, data.provider, {
      lastError: result.ok ? null : `Test failed (${result.status}): ${result.body}`,
    });
    return result;
  });

export const disconnectNotification = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ provider: ProviderSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const companyId = await actorCompany(context);
    await getIntegrationRepository(context.supabase).update(companyId, data.provider, {
      status: "disconnected",
      config: {},
      lastError: null,
    });
    return { ok: true };
  });
