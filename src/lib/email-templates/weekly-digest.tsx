import * as React from "react";
import { Text } from "@react-email/components";
import { BrandedEmail } from "./_layout";
import { defineTemplate, APP_URL, row } from "./_simple";

interface Props {
  workspaceName?: string;
  rangeLabel?: string;
  chatCount?: number;
  newSops?: number;
  openGaps?: number;
  newCerts?: number;
  topQuestions?: string[];
}

const Email = ({
  workspaceName,
  rangeLabel,
  chatCount,
  newSops,
  openGaps,
  newCerts,
  topQuestions,
}: Props) => (
  <BrandedEmail
    preview={`Your weekly OPSQAI digest for ${workspaceName ?? "your workspace"}`}
    title={`Weekly digest · ${rangeLabel ?? "last 7 days"}`}
    intro={`Here's what happened in ${workspaceName ?? "your workspace"} this week.`}
    ctaLabel="Open dashboard"
    ctaUrl={`${APP_URL}/management`}
  >
    <Text style={row}>
      <strong>Chat sessions:</strong> {chatCount ?? 0}
    </Text>
    <Text style={row}>
      <strong>SOPs published:</strong> {newSops ?? 0}
    </Text>
    <Text style={row}>
      <strong>Open knowledge gaps:</strong> {openGaps ?? 0}
    </Text>
    <Text style={row}>
      <strong>Certificates issued:</strong> {newCerts ?? 0}
    </Text>
    {topQuestions && topQuestions.length > 0 ? (
      <>
        <Text style={{ ...row, marginTop: 14, fontWeight: 600 }}>Top questions</Text>
        {topQuestions.slice(0, 5).map((q, i) => (
          <Text key={i} style={row}>
            • {q}
          </Text>
        ))}
      </>
    ) : null}
  </BrandedEmail>
);

export const template = defineTemplate({
  displayName: "Weekly digest",
  subject: (d) => `OPSQAI weekly digest${d.workspaceName ? ` · ${d.workspaceName}` : ""}`,
  component: Email,
  previewData: {
    workspaceName: "ACME Logistics",
    rangeLabel: "Jun 23 – Jun 29",
    chatCount: 312,
    newSops: 4,
    openGaps: 2,
    newCerts: 18,
    topQuestions: ["How do I report a damaged pallet?", "What's the cutoff for next-day dispatch?"],
  },
});

export default Email;
