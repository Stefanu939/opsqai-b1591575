import * as React from "react";
import { Text } from "@react-email/components";
import { BrandedEmail } from "./_layout";
import type { TemplateEntry } from "./registry";

interface Props {
  inviterName?: string;
  workspaceName?: string;
  role?: string;
  acceptUrl?: string;
}

const Email = ({ inviterName, workspaceName, role, acceptUrl }: Props) => (
  <BrandedEmail
    preview={`You've been invited to ${workspaceName ?? "an OPSQAI workspace"}`}
    title="You've been invited"
    intro={`${inviterName ?? "An OPSQAI admin"} invited you to join ${workspaceName ?? "their workspace"}${role ? ` as ${role}` : ""}.`}
    ctaLabel="Accept invitation"
    ctaUrl={acceptUrl ?? "https://opsqai.de"}
    securityNotice="Invitations expire in 7 days. If you weren't expecting this, you can ignore the email."
  >
    {role ? <Text style={{ fontSize: "14px", lineHeight: "22px", color: "#0f1729", margin: "0 0 6px" }}><strong>Role:</strong> {role}</Text> : null}
  </BrandedEmail>
);

export const template = {
  component: Email,
  subject: ({ workspaceName }: Record<string, any>) =>
    workspaceName ? `You've been invited to ${workspaceName} on OPSQAI` : "You've been invited to OPSQAI",
  displayName: "Workspace invitation",
  previewData: {
    inviterName: "Stefan B.",
    workspaceName: "ACME Logistics",
    role: "Manager",
    acceptUrl: "https://opsqai.de/accept-invite?token=demo",
  },
} satisfies TemplateEntry;

export default Email;
