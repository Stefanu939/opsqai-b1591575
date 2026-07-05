/**
 * Outbound webhook delivery — signed with HMAC-SHA256.
 *
 * Public API contract for subscribers (kept stable):
 *
 *   POST <endpoint.url>
 *   Content-Type: application/json
 *   X-OPSQAI-Event: <event>
 *   X-OPSQAI-Delivery: <uuid>
 *   X-OPSQAI-Signature: sha256=<hex(hmac_sha256(secret, body))>
 *   User-Agent: OPSQAI-Webhooks/1.0
 *
 * The delivery is logged to webhook_deliveries for audit/troubleshooting.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createHmac, randomBytes, randomUUID } from "crypto";

const TestInput = z.object({ endpoint_id: z.string().uuid() });

export const testWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TestInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: ep, error } = await context.supabase
      .from("webhook_endpoints")
      .select("id, company_id, url, secret, active")
      .eq("id", data.endpoint_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ep) throw new Error("Endpoint not found");

    const payload = {
      event: "webhook.test",
      delivery_id: randomUUID(),
      company_id: ep.company_id,
      sent_at: new Date().toISOString(),
      data: { message: "This is a test delivery from OPSQAI." },
    };
    const body = JSON.stringify(payload);
    const signature = "sha256=" + createHmac("sha256", ep.secret).update(body).digest("hex");

    const started = Date.now();
    let statusCode: number | null = null;
    let ok = false;
    let responseBody = "";
    let errMsg: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(ep.url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "user-agent": "OPSQAI-Webhooks/1.0",
          "x-opsqai-event": payload.event,
          "x-opsqai-delivery": payload.delivery_id,
          "x-opsqai-signature": signature,
        },
        body,
      });
      clearTimeout(timeout);
      statusCode = res.status;
      ok = res.ok;
      responseBody = (await res.text()).slice(0, 2000);
    } catch (e) {
      errMsg = e instanceof Error ? e.message : String(e);
    }

    const latency_ms = Date.now() - started;

    // Log delivery (best-effort)
    await context.supabase.from("webhook_deliveries").insert({
      endpoint_id: ep.id,
      company_id: ep.company_id,
      event: payload.event,
      status_code: statusCode,
      ok,
      response_body: responseBody || null,
      error: errMsg,
      latency_ms,
      attempt: 1,
    });

    // Update endpoint telemetry
    if (ok) {
      await context.supabase
        .from("webhook_endpoints")
        .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
        .eq("id", ep.id);
    } else {
      await context.supabase
        .from("webhook_endpoints")
        .update({
          last_failure_at: new Date().toISOString(),
          failure_count: 1,
        })
        .eq("id", ep.id);
    }

    return { ok, statusCode, latency_ms, error: errMsg };
  });

/** Generate a fresh HMAC signing secret (48 hex chars). */
export const generateWebhookSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ secret: randomBytes(24).toString("hex") }));

const EMIT_EVENTS = [
  "knowledge.published",
  "faq.created",
  "faq.updated",
  "sop.acknowledged",
  "gap.opened",
  "gap.resolved",
  "audit.exported",
] as const;
const EmitInput = z.object({
  event: z.enum(EMIT_EVENTS),
});

/**
 * Emit a real event through the dispatcher so admins can verify routing
 * (endpoint subscription, signature, delivery log) end-to-end.
 */
export const emitTestEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EmitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (!profile?.company_id) throw new Error("No company context");

    const { data: matching } = await context.supabase
      .from("webhook_endpoints")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("active", true)
      .contains("events", [data.event]);

    const { emitWebhookEvent } = await import("@/lib/webhook-dispatch.server");
    await emitWebhookEvent(profile.company_id as string, data.event as never, {
      test: true,
      note: "Test payload from OPSQAI admin — safe to ignore",
      emitted_by: context.userId,
    });
    return { ok: true, dispatched_to: matching?.length ?? 0 };
  });

