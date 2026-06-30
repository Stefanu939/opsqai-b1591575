/**
 * Subject → mailbox routing for the public contact form.
 * Shared between client (form UI) and server (dispatch).
 * Mailbox addresses default to OPSQAI inboxes and can be overridden per-platform
 * via the platform_email_settings table.
 */

export type ContactSubject =
  | "general"
  | "demo"
  | "sales"
  | "pricing"
  | "support"
  | "bug"
  | "security"
  | "privacy"
  | "partnership"
  | "other";

export const CONTACT_SUBJECT_LABELS: Record<ContactSubject, string> = {
  general: "General question",
  demo: "Book a demo",
  sales: "Sales inquiry",
  pricing: "Pricing request",
  support: "Technical support",
  bug: "Bug report",
  security: "Security report",
  privacy: "Privacy / GDPR",
  partnership: "Business partnership",
  other: "Other",
};

export interface RoutingMailboxes {
  contact: string;   // info@opsqai.de
  support: string;   // support@opsqai.de
  security: string;  // security@opsqai.de
  privacy: string;   // policy@opsqai.de
}

export const DEFAULT_MAILBOXES: RoutingMailboxes = {
  contact: "info@opsqai.de",
  support: "support@opsqai.de",
  security: "security@opsqai.de",
  privacy: "policy@opsqai.de",
};

export function routeContactSubject(subject: ContactSubject, mb: RoutingMailboxes = DEFAULT_MAILBOXES): string {
  switch (subject) {
    case "security":     return mb.security;
    case "privacy":      return mb.privacy;
    case "demo":
    case "sales":
    case "pricing":
    case "support":
    case "bug":          return mb.support;
    case "partnership":
    case "general":
    case "other":
    default:             return mb.contact;
  }
}
