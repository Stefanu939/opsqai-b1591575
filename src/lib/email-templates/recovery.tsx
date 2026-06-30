import * as React from "react";
import { BrandedEmail } from "./_layout";

interface RecoveryEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <BrandedEmail
    preview={`Reset your password for ${siteName}`}
    title="Reset your password"
    intro={`We received a request to reset your password for ${siteName}. The link is single-use and expires in 60 minutes.`}
    ctaLabel="Reset password"
    ctaUrl={confirmationUrl}
    securityNotice="If you didn't request a password reset, you can safely ignore this email — your password will not change."
  />
);

export default RecoveryEmail;
