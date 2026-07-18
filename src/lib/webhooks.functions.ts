/**
 * Outbound webhook delivery — signed with HMAC-SHA256.
 *
 * Public API contract for subscribers (kept stable):
 *
 *   POST <endpoint.url>
 *   Content-Type: application/json
 *   X-OPSQAI-Event: <import { getCloudSupabase } from "@/lib/providers/not-available";
event>
 *   X-OPSQAI-Delivery: <uuid>
 *   X-OPSQAI-Signature: sha256=<hex(hmac_sha256(secret, body))>
 *   User-Agent: OPSQAI-Webhooks/1.0
 *
 * The delivery is logged to webhook_deliveries for audit/troubleshooting.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { z } from "zod";
import { createHmac, randomBytes, randomUUID } from "crypto";

/**
 * SSRF guard for outbound webhook URLs. Rejects:
 *  - non-https schemes
 *  - IP-literal hosts in private / loopback / link-local / metadata ranges
 *  - well-known internal hostnames (localhost, *.internal, *.local, metadata.google.internal)
 *  - userinfo / non-default ports outside 443
 *
 * This runs before insert and again before dispatch as defense-in-depth.
 */
export function assertSafeWebhookUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (u.protocol !== "https:") throw new Error("Webhook URL must use https://");
  if (u.username || u.password) throw new Error("URL credentials are not allowed");
  if (u.port && u.port !== "443") throw new Error("Only port 443 is allowed");

  const host = u.hostname.toLowerCase();
  if (!host) throw new Error("Invalid host");

  // Block obvious internal hostnames
  const blockedHosts = new Set([
    "localhost",
    "ip6-localhost",
    "ip6-loopback",
    "metadata.google.internal",
    "metadata",
  ]);
  if (blockedHosts.has(host)) throw new Error("Host is not allowed");
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Host is not allowed");
  }

  // IPv4 literal ranges: private, loopback, link-local, metadata, CGNAT, broadcast, 0.0.0.0/8
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) || // link-local / AWS/Azure/GCP metadata (169.254.169.254)
      (a === 172 && b >= 16 && b <= 31) || // private
      (a === 192 && b === 168) || // private
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      a >= 224 // multicast + reserved + broadcast
    ) {
      throw new Error("Private, loopback, or metadata IP addresses are not allowed");
    }
  }

  // IPv6 literal — hostname strips brackets. Block loopback, link-local, ULA, unspecified,
  // IPv4-mapped, and Alibaba/OCI-style metadata (fd00::) ranges.
  if (host.includes(":")) {
    const h = host;
    if (
      h === "::" ||
      h === "::1" ||
      h.startsWith("fe80:") || // link-local
      h.startsWith("fc") ||
      h.startsWith("fd") || // unique local
      h.startsWith("::ffff:") || // IPv4-mapped
      h.startsWith("2001:db8:") // documentation
    ) {
      throw new Error("Private or loopback IPv6 addresses are not allowed");
    }
  }

  // Block Alibaba Cloud / OCI-style plain literals
  if (host === "100.100.100.200" || host === "192.0.0.192") {
    throw new Error("Metadata service address is not allowed");
  }

  return u;
}

const TestInput = z.object({ endpoint_id: z.string().uuid() });

const CreateInput = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(2048),
  events: z.array(z.string().max(64)).max(50),
});

export const createWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    // Validate URL server-side (SSRF guard).
    assertSafeWebhookUrl(data.url);

    // Resolve caller's company.
    const { data: profile } = await getCloudSupabase(context, "webhooks")
      .from("profiles")
      .select("company_id")
      .eq("id", context.userId)
      .maybeSingle();
    const companyId = profile?.company_id;
    if (!companyId) throw new Error("No active company");

    const secret = randomBytes(24).toString("hex");
    const { data: row, error } = await getCloudSupabase(context, "webhooks")
      .from("webhook_endpoints")
      .insert({
        company_id: companyId,
        name: data.name,
        url: data.url,
        secret,
        events: data.events,
        active: true,
        created_by: context.userId,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: row?.id, secret };
  });

export const testWebhook = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => TestInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: ep, error } = await getCloudSupabase(context, "webhooks")
      .from("webhook_endpoints")
      .select("id, company_id, url, secret, active")
      .eq("id", data.endpoint_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ep) throw new Error("Endpoint not found");
    // SSRF guard on the stored URL — protects against endpoints created before validation was in place.
    assertSafeWebhookUrl(ep.url);

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
    await getCloudSupabase(context, "webhooks").from("webhook_deliveries").insert({
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
      await getCloudSupabase(context, "webhooks")
        .from("webhook_endpoints")
        .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
        .eq("id", ep.id);
    } else {
      await getCloudSupabase(context, "webhooks")
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
  .middleware([requireAuth])
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
  .middleware([requireAuth])
  .inputValidator((d: unknown) => EmitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile } = await getCloudSupabase(context, "webhooks")
      .from("profiles")
      .select("company_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.company_id) throw new Error("No company context");

    const { data: matching } = await getCloudSupabase(context, "webhooks")
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
