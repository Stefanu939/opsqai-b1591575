/**
 * EmailProvider — thin abstraction over the underlying email transport.
 *
 * OPSQAI ships with the "lovable" provider by default (managed queue with
 * retries, suppression, DKIM/SPF/DMARC, send logs). The interface is
 * deliberately small so SMTP / Resend / SendGrid / Mailgun / Postmark
 * adapters can be added later without touching any caller.
 *
 * Callers should NEVER import a specific provider. Instead they call the
 * centralised EmailService (server functions) which selects the configured
 * provider based on platform_email_settings.provider.
 */

export type ProviderId = "lovable" | "smtp" | "resend" | "sendgrid" | "mailgun" | "postmark";

export interface SendEmailInput {
  to: string;
  from: string;          // formatted "Name <addr@domain>"
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  messageId: string;
  templateName: string;  // for logging
  purpose?: "transactional" | "auth";
}

export interface EmailProvider {
  readonly id: ProviderId;
  /** Enqueue the message; resolves once accepted by the underlying transport. */
  send(input: SendEmailInput): Promise<{ queued: true }>;
}
