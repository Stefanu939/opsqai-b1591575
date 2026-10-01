// Microsoft Graph mail access for Email Intelligence (Self-Hosted only).
// App-only token from the existing Entra app registration: the customer grants
// the application permission Mail.Read (admin consent). OPSQAI reads the team
// inbox only — it never sends email autonomously.

import { getMicrosoftConfig, graphGet } from "./entra.server";

const GRAPH = "https://graph.microsoft.com/v1.0";

function esc(s: string) {
  return encodeURIComponent(s);
}

export interface MailListItem {
  id: string;
  subject: string | null;
  receivedDateTime: string | null;
  bodyPreview: string | null;
  hasAttachments: boolean;
  from?: { emailAddress?: { name?: string | null; address?: string | null } };
}

export interface MailFull extends MailListItem {
  body?: { content?: string; text?: string };
  attachments?: Array<{ name?: string | null; size?: number }>;
}

export async function listMailboxMessages(mailbox: string, top = 25): Promise<MailListItem[]> {
  const url =
    `${GRAPH}/users/${esc(mailbox)}/mailFolders/Inbox/messages` +
    `?$top=${top}&$orderby=receivedDateTime desc` +
    `&$select=id,subject,receivedDateTime,bodyPreview,hasAttachments,from`;
  const json = await graphGet<{ value: MailListItem[] }>(url);
  return Array.isArray(json.value) ? json.value : [];
}

export async function getMailboxMessage(mailbox: string, id: string): Promise<MailFull> {
  const url =
    `${GRAPH}/users/${esc(mailbox)}/messages/${esc(id)}` +
    `?$select=id,subject,receivedDateTime,bodyPreview,hasAttachments,from,body,attachments`;
  return await graphGet<MailFull>(url);
}

/** RFC-822-ish plain text of a message body (HTML stripped). */
export function bodyToText(full: MailFull): string {
  const html = full.body?.content ?? "";
  const text = (full.body?.text ?? html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n");
  return text.trim().slice(0, 20_000);
}

/** Quick Graph readiness probe used by "Test connection". */
export async function testMailboxAccess(mailbox: string): Promise<boolean> {
  await getMicrosoftConfig(); // throws when Entra is not configured
  await graphGet(
    `${GRAPH}/users/${esc(mailbox)}?$select=id`,
  );
  return true;
}
