// SMTP-backed INotificationProvider for OPSQAI Self-Hosted.
//
// SMTP credentials are supplied by the installer's SMTP Settings step
// and stored encrypted by the ISecretsCipher (DPAPI). Nodemailer talks
// to any RFC-compliant SMTP server: Microsoft 365, Exchange, SendGrid,
// Postmark, or an on-prem relay. No cloud dependency.

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import type {
  EmailMessage,
  INotificationProvider,
} from "@/lib/providers/interfaces";
import { Capability } from "@/lib/platform";

export interface SmtpNotificationDeps {
  host: string;
  port: number;
  secure: boolean; // implicit TLS (465) vs STARTTLS on 587
  username?: string;
  password?: string;
  fromAddress: string;
  fromName?: string;
}

export function createSmtpNotificationProvider(
  deps: SmtpNotificationDeps,
): INotificationProvider {
  const transporter: Transporter = nodemailer.createTransport({
    host: deps.host,
    port: deps.port,
    secure: deps.secure,
    auth: deps.username
      ? { user: deps.username, pass: deps.password ?? "" }
      : undefined,
    // Allow the installer's Send Test Email button to fail fast rather
    // than hanging on an unreachable host.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  const from = deps.fromName ? `"${deps.fromName}" <${deps.fromAddress}>` : deps.fromAddress;

  async function sendEmail(message: EmailMessage): Promise<void> {
    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text ?? message.html.replace(/<[^>]+>/g, ""),
    });
  }

  return {
    capability: Capability.SMTP,
    name: "opsqai.selfhost.smtp",
    sendEmail,
    async sendTestEmail(to: string) {
      await sendEmail({
        to,
        subject: "OPSQAI SMTP test",
        html:
          "<p>This is a test message from your OPSQAI Self-Hosted installation.</p>" +
          "<p>If you received it, SMTP is configured correctly.</p>",
      });
    },
  };
}
