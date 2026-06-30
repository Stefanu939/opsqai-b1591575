import * as React from "react";
import { BrandedEmail } from "./_layout";

interface SignupEmailProps {
  siteName: string;
  siteUrl: string;
  recipient: string;
  confirmationUrl: string;
}

export const SignupEmail = ({ siteName, recipient, confirmationUrl }: SignupEmailProps) => (
  <BrandedEmail
    preview={`Confirm your email for ${siteName}`}
    title="Confirm your email"
    intro={`Welcome to ${siteName}. Please verify ${recipient} to activate your account.`}
    ctaLabel="Verify email"
    ctaUrl={confirmationUrl}
    securityNotice="If you didn't create an account, you can safely ignore this email."
  />
);

export default SignupEmail;
