import * as React from "react";
import { BrandedEmail } from "./_layout";

interface MagicLinkEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <BrandedEmail
    preview={`Your sign-in link for ${siteName}`}
    title="Sign in to OPSQAI"
    intro={`Click the button below to sign in to ${siteName}. This link expires in 15 minutes and can be used once.`}
    ctaLabel="Sign in"
    ctaUrl={confirmationUrl}
    securityNotice="If you didn't request this link, you can safely ignore this email."
  />
);

export default MagicLinkEmail;
