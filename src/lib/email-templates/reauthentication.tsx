import * as React from "react";
import { Text } from "@react-email/components";
import { BrandedEmail } from "./_layout";

interface ReauthenticationEmailProps {
  token: string;
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <BrandedEmail
    preview="Your OPSQAI verification code"
    title="Confirm it's you"
    intro="Use this single-use verification code to confirm your identity. It expires in 10 minutes."
    securityNotice="If you didn't request this code, you can safely ignore this email."
  >
    <Text
      style={{
        display: "inline-block",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "26px",
        fontWeight: 700,
        letterSpacing: "0.18em",
        color: "#0f1729",
        background: "#f7f8fa",
        border: "1px solid #e4e7ec",
        borderRadius: "10px",
        padding: "10px 16px",
        margin: "8px 0 0",
      }}
    >
      {token}
    </Text>
  </BrandedEmail>
);

export default ReauthenticationEmail;
