import * as React from "react";
import { Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { BrandedEmail } from "./_layout";
import { BRAND } from "./_brand";

/**
 * Lightweight helper to keep every transactional template visually consistent.
 * All real templates use BrandedEmail + the row style below.
 */
export const row: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#0f1729",
  margin: "0 0 6px",
};

export interface SimpleEmailProps {
  preview: string;
  title: string;
  intro?: string;
  cta?: { label: string; url: string };
  notice?: string;
  rows?: Array<{ label: string; value: string }>;
  body?: string;
}

/** A standard one-paragraph-plus-metadata transactional email body. */
export function SimpleEmail({
  preview,
  title,
  intro,
  cta,
  notice,
  rows = [],
  body,
}: SimpleEmailProps) {
  return (
    <BrandedEmail
      preview={preview}
      title={title}
      intro={intro}
      bodyText={body}
      ctaLabel={cta?.label}
      ctaUrl={cta?.url}
      securityNotice={notice}
    >
      {rows.map((r) => (
        <Text key={r.label} style={row}>
          <strong>{r.label}:</strong> {r.value}
        </Text>
      ))}
    </BrandedEmail>
  );
}

export function defineTemplate(args: {
  displayName: string;
  subject: TemplateEntry["subject"];
  component: TemplateEntry["component"];
  previewData?: Record<string, unknown>;
}): TemplateEntry {
  return {
    component: args.component,
    subject: args.subject,
    displayName: args.displayName,
    previewData: args.previewData,
  };
}

export const APP_URL = BRAND.website;
