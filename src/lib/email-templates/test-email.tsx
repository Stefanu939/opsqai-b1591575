import * as React from "react";
import { Text } from "@react-email/components";
import { BrandedEmail } from "./_layout";
import type { TemplateEntry } from "./registry";

interface Props {
  triggeredBy?: string;
  triggeredAt?: string;
  provider?: string;
}

const Email = ({ triggeredBy, triggeredAt, provider }: Props) => (
  <BrandedEmail
    preview="OPSQAI email infrastructure test"
    title="Email infrastructure test"
    intro="This message confirms your OPSQAI Email Service is configured correctly: sender domain, provider, template rendering and queue delivery are all working."
    securityNotice="If you didn't trigger this test, please review your platform admin access immediately."
  >
    <Text style={row}><strong>Provider:</strong> {provider ?? "Lovable Emails"}</Text>
    <Text style={row}><strong>Triggered by:</strong> {triggeredBy ?? "Platform Owner"}</Text>
    <Text style={row}><strong>Sent:</strong> {triggeredAt ?? new Date().toLocaleString()}</Text>
  </BrandedEmail>
);

const row: React.CSSProperties = { fontSize: "14px", lineHeight: "22px", color: "#0f1729", margin: "0 0 6px" };

export const template = {
  component: Email,
  subject: "OPSQAI · Email service test",
  displayName: "Email service test",
  previewData: {
    triggeredBy: "platform_owner@opsqai.de",
    triggeredAt: new Date().toLocaleString(),
    provider: "Lovable Emails",
  },
} satisfies TemplateEntry;

export default Email;
