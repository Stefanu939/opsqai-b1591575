import type { ComponentType } from "react";

export interface TemplateEntry {
  component: ComponentType<any>;
  subject: string | ((data: Record<string, any>) => string);
  displayName?: string;
  previewData?: Record<string, any>;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

import { template as contactConfirmation } from "./contact-confirmation";
import { template as workspaceInvitation } from "./workspace-invitation";
import { template as certificateReady } from "./certificate-ready";
import { template as supportTicketCreated } from "./support-ticket-created";
import { template as testEmail } from "./test-email";

/**
 * Central registry. Every OPSQAI transactional email lives here.
 * Auth emails are handled separately by the auth webhook.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  "contact-confirmation": contactConfirmation,
  "workspace-invitation": workspaceInvitation,
  "certificate-ready": certificateReady,
  "support-ticket-created": supportTicketCreated,
  "test-email": testEmail,
};
