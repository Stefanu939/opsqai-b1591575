/* Server-only. Centralised template render + provider dispatch. */
import * as React from "react";
import { render } from "react-email";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TEMPLATES } from "@/lib/email-templates/registry";
import type { EmailProvider, ProviderId, SendEmailInput } from "./provider";

const SITE_NAME = "OPSQAI";
const SENDER_DOMAIN = "notify.opsqai.de";
const FROM_DOMAIN = "opsqai.de";

interface PlatformEmailSettings {
  sender_name: string;
  sender_email: string;
  reply_to_email: string;
  provider: ProviderId;
}

function admin(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("email_service_misconfigured");
  return createClient(url, key);
}

async function loadSettings(sb: SupabaseClient): Promise<PlatformEmailSettings> {
  const { data } = await sb
    .from("platform_email_settings")
    .select("sender_name, sender_email, reply_to_email, provider")
    .eq("id", true)
    .maybeSingle();
  return (
    (data as PlatformEmailSettings | null) ?? {
      sender_name: SITE_NAME,
      sender_email: `noreply@${FROM_DOMAIN}`,
      reply_to_email: `support@${FROM_DOMAIN}`,
      provider: "lovable",
    }
  );
}

/** Generate a cryptographically random 32-byte hex token. */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get-or-create the unsubscribe token for a recipient. Transactional emails
 * MUST include this token or Lovable Send returns 400.
 * Auth emails do not require it.
 */
async function resolveUnsubscribeToken(sb: SupabaseClient, email: string): Promise<string> {
  const normalized = email.toLowerCase();
  const { data: existing } = await sb
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalized)
    .maybeSingle();
  if (existing && !existing.used_at) return existing.token as string;

  const token = generateToken();
  await sb
    .from("email_unsubscribe_tokens")
    .upsert({ token, email: normalized }, { onConflict: "email", ignoreDuplicates: true });
  const { data: stored } = await sb
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .maybeSingle();
  if (!stored?.token) throw new Error("unsubscribe_token_unavailable");
  return stored.token as string;
}

/** Lovable Emails provider: enqueue into pgmq, logged in email_send_log. */
function createLovableProvider(sb: SupabaseClient): EmailProvider {
  return {
    id: "lovable",
    async send(input) {
      await sb.from("email_send_log").insert({
        message_id: input.messageId,
        template_name: input.templateName,
        recipient_email: input.to,
        status: "pending",
      });
      const purpose = input.purpose ?? "transactional";
      const unsubscribeToken =
        purpose === "auth" ? undefined : await resolveUnsubscribeToken(sb, input.to);
      const { error } = await sb.rpc("enqueue_email", {
        queue_name: purpose === "auth" ? "auth_emails" : "transactional_emails",
        payload: {
          message_id: input.messageId,
          to: input.to,
          from: input.from,
          reply_to: input.replyTo,
          sender_domain: SENDER_DOMAIN,
          subject: input.subject,
          html: input.html,
          text: input.text,
          purpose,
          label: input.templateName,
          idempotency_key: input.messageId,
          ...(unsubscribeToken ? { unsubscribe_token: unsubscribeToken } : {}),
          queued_at: new Date().toISOString(),
        },
      });
      if (error) {
        await sb.from("email_send_log").insert({
          message_id: input.messageId,
          template_name: input.templateName,
          recipient_email: input.to,
          status: "failed",
          error_message: "Failed to enqueue email",
        });
        throw new Error("email_enqueue_failed");
      }
      return { queued: true };
    },
  };
}


function selectProvider(id: ProviderId, sb: SupabaseClient): EmailProvider {
  switch (id) {
    case "lovable":
      return createLovableProvider(sb);
    // Stubs for future adapters — same interface, no caller changes needed.
    case "smtp":
    case "resend":
    case "sendgrid":
    case "mailgun":
    case "postmark":
      throw new Error(`email_provider_not_implemented:${id}`);
    default:
      return createLovableProvider(sb);
  }
}

export interface DispatchInput {
  templateName: string;
  recipientEmail: string;
  templateData?: Record<string, unknown>;
  /** Optional override of the configured Reply-To. */
  replyTo?: string;
  /** Pre-known message id for idempotency / logging cross-reference. */
  messageId?: string;
}

/**
 * Render the registered template and dispatch it through the active provider.
 * This is the ONE function every OPSQAI module should call when sending app email.
 */
export async function dispatchTransactionalEmail(input: DispatchInput): Promise<{ messageId: string }> {
  const entry = TEMPLATES[input.templateName];
  if (!entry) throw new Error(`unknown_template:${input.templateName}`);

  const sb = admin();
  const settings = await loadSettings(sb);

  // Check suppression list before doing any work.
  const { data: suppressed } = await sb
    .from("suppressed_emails")
    .select("email")
    .eq("email", input.recipientEmail.toLowerCase())
    .maybeSingle();
  if (suppressed) {
    await sb.from("email_send_log").insert({
      message_id: crypto.randomUUID(),
      template_name: input.templateName,
      recipient_email: input.recipientEmail,
      status: "suppressed",
      error_message: "Recipient on suppression list",
    });
    throw new Error("recipient_suppressed");
  }

  const data = input.templateData ?? {};
  const element = React.createElement(entry.component, data);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject = typeof entry.subject === "function" ? entry.subject(data) : entry.subject;
  const to = entry.to ?? input.recipientEmail;
  const messageId = input.messageId ?? crypto.randomUUID();

  const payload: SendEmailInput = {
    to,
    from: `${settings.sender_name} <${settings.sender_email}>`,
    replyTo: input.replyTo ?? settings.reply_to_email,
    subject,
    html,
    text,
    messageId,
    templateName: input.templateName,
    purpose: "transactional",
  };

  const provider = selectProvider(settings.provider, sb);
  await provider.send(payload);
  return { messageId };
}
