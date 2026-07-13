import * as React from "react";
import { Text } from "@react-email/components";
import { BrandedEmail } from "./_layout";
import type { TemplateEntry } from "./registry";

interface Props {
  learnerName?: string;
  pathTitle?: string;
  score?: number;
  certificateUrl?: string;
  verifyUrl?: string;
}

const Email = ({ learnerName, pathTitle, score, certificateUrl, verifyUrl }: Props) => (
  <BrandedEmail
    preview={`Your certificate for ${pathTitle ?? "OPSQAI Academy"} is ready`}
    title="Your certificate is ready"
    intro={`Congratulations${learnerName ? `, ${learnerName}` : ""} — you completed ${pathTitle ?? "your learning path"} on OPSQAI Academy.`}
    ctaLabel="Download certificate"
    ctaUrl={certificateUrl ?? "https://opsqai.de"}
  >
    {typeof score === "number" ? (
      <Text style={{ fontSize: "14px", lineHeight: "22px", color: "#0f1729", margin: "0 0 6px" }}>
        <strong>Final score:</strong> {score}%
      </Text>
    ) : null}
    {verifyUrl ? (
      <Text style={{ fontSize: "13px", lineHeight: "20px", color: "#55607a", margin: "8px 0 0" }}>
        Public verification:{" "}
        <a href={verifyUrl} style={{ color: "#3a5bb8" }}>
          {verifyUrl}
        </a>
      </Text>
    ) : null}
  </BrandedEmail>
);

export const template = {
  component: Email,
  subject: ({ pathTitle }: Record<string, any>) =>
    pathTitle ? `Certificate ready: ${pathTitle}` : "Your OPSQAI Academy certificate is ready",
  displayName: "Certificate ready",
  previewData: {
    learnerName: "Jane Doe",
    pathTitle: "Warehouse Safety Essentials",
    score: 92,
    certificateUrl: "https://opsqai.de",
    verifyUrl: "https://opsqai.de/verify/ABC-123",
  },
} satisfies TemplateEntry;

export default Email;
