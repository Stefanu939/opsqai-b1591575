import * as React from "react";
import { Text } from "@react-email/components";
import { BrandedEmail } from "./_layout";

interface EmailChangeEmailProps {
  siteName: string;
  oldEmail: string;
  email: string;
  newEmail: string;
  confirmationUrl: string;
}

export const EmailChangeEmail = ({ siteName, oldEmail, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <BrandedEmail
    preview={`Confirm your email change for ${siteName}`}
    title="Confirm your email change"
    intro={`You requested to change your ${siteName} email address.`}
    ctaLabel="Confirm change"
    ctaUrl={confirmationUrl}
    securityNotice="If you didn't request this change, secure your account immediately and contact support."
  >
    <Text style={{ fontSize: "14px", lineHeight: "22px", color: "#0f1729", margin: "0 0 8px" }}>
      <strong>From:</strong> {oldEmail}
    </Text>
    <Text style={{ fontSize: "14px", lineHeight: "22px", color: "#0f1729", margin: "0 0 16px" }}>
      <strong>To:</strong> {newEmail}
    </Text>
  </BrandedEmail>
);

export default EmailChangeEmail;
