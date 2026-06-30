import * as React from "react";
import { Text } from "@react-email/components";
import { BrandedEmail } from "./_layout";
import type { TemplateEntry } from "./registry";

interface Props {
  requesterName?: string;
  ticketId?: string;
  subjectLine?: string;
  ticketUrl?: string;
}

const Email = ({ requesterName, ticketId, subjectLine, ticketUrl }: Props) => (
  <BrandedEmail
    preview={`Ticket ${ticketId ?? ""} received`}
    title="We received your support request"
    intro={`Thanks${requesterName ? `, ${requesterName}` : ""} — a support engineer will review your request and respond shortly.`}
    ctaLabel={ticketUrl ? "View ticket" : undefined}
    ctaUrl={ticketUrl}
  >
    {ticketId ? <Text style={row}><strong>Ticket:</strong> {ticketId}</Text> : null}
    {subjectLine ? <Text style={row}><strong>Subject:</strong> {subjectLine}</Text> : null}
    <Text style={row}><strong>Expected first response:</strong> within 1 business day (CET)</Text>
  </BrandedEmail>
);

const row: React.CSSProperties = { fontSize: "14px", lineHeight: "22px", color: "#0f1729", margin: "0 0 6px" };

export const template = {
  component: Email,
  subject: ({ ticketId }: Record<string, any>) =>
    ticketId ? `Support ticket ${ticketId} received` : "Support ticket received",
  displayName: "Support ticket created",
  previewData: {
    requesterName: "Jane",
    ticketId: "OPS-1042",
    subjectLine: "Cannot publish SOP",
    ticketUrl: "https://opsqai.de",
  },
} satisfies TemplateEntry;

export default Email;
