/**
 * Outbound webhook dispatcher.
 * Server-only. Load lazily from server functions to avoid client bundling.
 */
import { createHmac } from "crypto";

export type WebhookEvent =
  | "knowledge.published"
  | "faq.created"
  | "faq.updated"
  | "sop.acknowledged"
  | "gap.opened"
  | "gap.resolved"
  | "user.provisioned"
  | "user.deprovisioned"
  | "audit.exported"
  | "test.ping";

type Endpoint = {
  id: string;
  url: string;
  secret: string;
  events: string[];
};

const DELIVERY_TIMEOUT_MS = 8000;

function signPayload(secret: string, body: string, timestamp: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(`${timestamp}.${body}`);
  return `sha256=${hmac.digest("hex")}`;
}

async function deliverOne(
  endpoint: Endpoint,
  event: WebhookEvent,
  payload: Record<string, unknown>,
  companyId: string,
): Promise<{
  ok: boolean;
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
  responseBody: string | null;
}> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({
    event,
    company_id: companyId,
    delivered_at: new Date().toISOString(),
    data: payload,
  });
  const signature = signPayload(endpoint.secret, body, timestamp);

  // SSRF guard — refuse to dispatch to private/loopback/metadata targets even if a row slipped through.
  try {
    const { assertSafeWebhookUrl } = await import("@/lib/webhooks.functions");
    assertSafeWebhookUrl(endpoint.url);
  } catch (err) {
    return {
      ok: false,
      statusCode: null,
      latencyMs: 0,
      error: err instanceof Error ? err.message : "url_blocked",
      responseBody: null,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "OPSQAI-Webhooks/1.0",
        "x-opsqai-event": event,
        "x-opsqai-timestamp": timestamp,
        "x-opsqai-signature": signature,
        "x-opsqai-delivery": crypto.randomUUID(),
      },
      body,
      signal: controller.signal,
    });
    const latencyMs = Date.now() - start;
    let respText: string | null = null;
    try {
      respText = (await res.text()).slice(0, 2000);
    } catch {
      /* ignore */
    }
    return {
      ok: res.ok,
      statusCode: res.status,
      latencyMs,
      error: res.ok ? null : `HTTP ${res.status}`,
      responseBody: respText,
    };
  } catch (err) {
    return {
      ok: false,
      statusCode: null,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "delivery_failed",
      responseBody: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Dispatch an event to all active endpoints subscribed to it for a company.
 * Fire-and-forget — never throws (webhook failures must not break app writes).
 */
export async function emitWebhookEvent(
  companyId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: endpoints, error } = await supabaseAdmin
      .from("webhook_endpoints")
      .select("id, url, secret, events")
      .eq("company_id", companyId)
      .eq("active", true);

    if (error || !endpoints || endpoints.length === 0) return;

    const matching = (endpoints as Endpoint[]).filter((e) => e.events.includes(event));
    if (matching.length === 0) return;

    await Promise.all(
      matching.map(async (ep) => {
        const result = await deliverOne(ep, event, payload, companyId);

        // Record delivery
        await supabaseAdmin.from("webhook_deliveries").insert({
          endpoint_id: ep.id,
          company_id: companyId,
          event,
          status_code: result.statusCode,
          ok: result.ok,
          response_body: result.responseBody,
          error: result.error,
          latency_ms: result.latencyMs,
          attempt: 1,
        });

        // Update endpoint health
        if (result.ok) {
          await supabaseAdmin
            .from("webhook_endpoints")
            .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
            .eq("id", ep.id);
        } else {
          const { data: cur } = await supabaseAdmin
            .from("webhook_endpoints")
            .select("failure_count")
            .eq("id", ep.id)
            .maybeSingle();
          const nextCount = ((cur?.failure_count as number | undefined) ?? 0) + 1;
          await supabaseAdmin
            .from("webhook_endpoints")
            .update({
              last_failure_at: new Date().toISOString(),
              failure_count: nextCount,
              // Auto-disable after 10 consecutive failures
              active: nextCount >= 10 ? false : true,
            })
            .eq("id", ep.id);
        }
      }),
    );
  } catch (err) {
    // Never let webhook errors bubble up
    console.error("webhook dispatch failed:", err);
  }
}
