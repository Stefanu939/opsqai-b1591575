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
import { template as supportReply } from "./support-reply";
import { template as testEmail } from "./test-email";
import { template as welcome } from "./welcome";
import { template as passwordChanged } from "./password-changed";
import { template as roleChanged } from "./role-changed";
import { template as sopPublished } from "./sop-published";
import { template as sopAckRequested } from "./sop-ack-requested";
import { template as gapAssigned } from "./gap-assigned";
import { template as gapResolved } from "./gap-resolved";
import { template as requestCreated } from "./request-created";
import { template as requestResolved } from "./request-resolved";
import { template as exportReady } from "./export-ready";
import { template as weeklyDigest } from "./weekly-digest";
import { template as documentApproval } from "./document-approval";
import { template as accountDeactivated } from "./account-deactivated";
import { template as securityAlert } from "./security-alert";

/**
 * Central registry — every OPSQAI transactional email lives here.
 * Auth emails are handled separately by the auth webhook.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  "contact-confirmation": contactConfirmation,
  "workspace-invitation": workspaceInvitation,
  "certificate-ready": certificateReady,
  "support-ticket-created": supportTicketCreated,
  "support-reply": supportReply,
  "test-email": testEmail,
  "welcome": welcome,
  "password-changed": passwordChanged,
  "role-changed": roleChanged,
  "sop-published": sopPublished,
  "sop-ack-requested": sopAckRequested,
  "gap-assigned": gapAssigned,
  "gap-resolved": gapResolved,
  "request-created": requestCreated,
  "request-resolved": requestResolved,
  "export-ready": exportReady,
  "weekly-digest": weeklyDigest,
  "document-approval": documentApproval,
  "account-deactivated": accountDeactivated,
  "security-alert": securityAlert,
};
