/* Server-only. Centralised template render + managed send. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { EmailAPIError } from "@lovable.dev/email-js";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const SITE_NAME = "OPSQAI";
const FROM_DOMAIN = "opsqai.de";

interface PlatformEmailSettings {
  sender_name: string;
  sender_email: string;
  reply_to_email: string;
}

async function admin(): Promise<SupabaseClient> {
  // Dynamic import so the Cloud-only service-role factory resolves through
  // the Wave D alias in Self-Hosted builds (→ throwing cloud-stub). Keeps
  // the Supabase URL and service-role env name out of the SH bundle.
  const mod = await import("@/lib/providers/cloud/service-role.server");
  return mod.createServiceRoleClient();
}

async function loadSettings(sb: SupabaseClient): Promise<PlatformEmailSettings> {
  const { data } = await sb
    .from("platform_email_settings")
    .select("sender_name, sender_email, reply_to_email")
    .eq("id", true)
    .maybeSingle();
  return (
    (data as PlatformEmailSettings | null) ?? {
      sender_name: SITE_NAME,
      sender_email: `noreply@${FROM_DOMAIN}`,
      reply_to_email: `support@${FROM_DOMAIN}`,
    }
  );
}

async function log(
  sb: SupabaseClient,
  row: {
    message_id: string;
    template_name: string;
    recipient_email: string;
    status: "sent" | "suppressed" | "failed";
    error_message?: string;
  },
): Promise<void> {
  const { error } = await sb.from("email_send_log").insert(row);
  if (error) {
    console.error("Failed to write email_send_log", {
      code: error.code,
      message: error.message,
      status: row.status,
    });
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
 * Render the registered template and send it through Lovable's managed email
 * API. This is the ONE function every OPSQAI module should call when sending
 * app email. Suppression, retries, rate limits, and unsubscribe are enforced
 * by Lovable server-side.
 */
export async function dispatchTransactionalEmail(
  input: DispatchInput,
): Promise<{ messageId: string }> {
  const sb = await admin();
  const settings = await loadSettings(sb);
  const messageId = input.messageId ?? crypto.randomUUID();

  let result;
  try {
    result = await sendTemplateEmail(input.templateName, input.recipientEmail, {
      templateData: input.templateData ?? {},
      idempotencyKey: messageId,
      replyTo: input.replyTo ?? settings.reply_to_email,
    });
  } catch (error) {
    const message =
      error instanceof EmailAPIError
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);
    await log(sb, {
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: input.recipientEmail,
      status: "failed",
      error_message: message.slice(0, 1000),
    });
    throw error;
  }

  if (!result.sent) {
    await log(sb, {
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: input.recipientEmail,
      status: "suppressed",
      error_message: "Recipient on suppression list",
    });
    throw new Error("recipient_suppressed");
  }

  await log(sb, {
    message_id: messageId,
    template_name: input.templateName,
    recipient_email: input.recipientEmail,
    status: "sent",
  });
  return { messageId };
}
