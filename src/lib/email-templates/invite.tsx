import * as React from "react";
import { BrandedEmail } from "./_layout";

interface InviteEmailProps {
  siteName: string;
  siteUrl: string;
  confirmationUrl: string;
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <BrandedEmail
    preview={`You've been invited to ${siteName}`}
    title="You've been invited"
    intro={`You've been invited to collaborate on ${siteName}. Accept the invitation to create your account.`}
    ctaLabel="Accept invitation"
    ctaUrl={confirmationUrl}
    securityNotice="If you weren't expecting this invitation, you can safely ignore this email."
  />
);

export default InviteEmail;
