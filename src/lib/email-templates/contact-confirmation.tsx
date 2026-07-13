import * as React from "react";
import { Text } from "@react-email/components";
import { BrandedEmail } from "./_layout";
import { BRAND } from "./_brand";
import type { TemplateEntry } from "./registry";

interface Props {
  firstName?: string;
  referenceId?: string;
  subjectLabel?: string;
  submittedAt?: string;
  expectedResponse?: string;
}

const Email = ({ firstName, referenceId, subjectLabel, submittedAt, expectedResponse }: Props) => (
  <BrandedEmail
    preview="We received your request"
    title="We received your request"
    intro={`Hello ${firstName ?? "there"}, thank you for contacting OPSQAI. Our team will review your inquiry and respond as soon as possible.`}
    ctaLabel="Visit OPSQAI"
    ctaUrl={BRAND.website}
    securityNotice="If you didn't contact OPSQAI, you can ignore this message."
  >
    <Text style={row}>
      <strong>Reference ID:</strong> {referenceId ?? "—"}
    </Text>
    {subjectLabel ? (
      <Text style={row}>
        <strong>Topic:</strong> {subjectLabel}
      </Text>
    ) : null}
    {submittedAt ? (
      <Text style={row}>
        <strong>Submitted:</strong> {submittedAt}
      </Text>
    ) : null}
    <Text style={row}>
      <strong>Expected response:</strong> {expectedResponse ?? "Within 1 business day (CET)"}
    </Text>
  </BrandedEmail>
);

const row: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#0f1729",
  margin: "0 0 6px",
};

export const template = {
  component: Email,
  subject: "We received your request — OPSQAI",
  displayName: "Contact confirmation",
  previewData: {
    firstName: "Jane",
    referenceId: "REQ-12AB34CD",
    subjectLabel: "Book a demo",
    submittedAt: new Date().toLocaleString(),
    expectedResponse: "Within 1 business day (CET)",
  },
} satisfies TemplateEntry;

export default Email;
