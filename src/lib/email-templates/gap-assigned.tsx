import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: { topic?: string; gapUrl?: string; priority?: string }) => (
  <SimpleEmail
    preview={`Knowledge gap assigned: ${p.topic ?? "New topic"}`}
    title="A knowledge gap was assigned to you"
    intro={`Your team needs documentation on "${p.topic ?? "a new topic"}". You've been assigned to close this gap.`}
    rows={p.priority ? [{ label: "Priority", value: p.priority }] : []}
    cta={{ label: "Open knowledge gap", url: p.gapUrl ?? `${APP_URL}/app/admin/knowledge-gaps` }}
  />
);
export const template = defineTemplate({
  displayName: "Knowledge gap assigned",
  subject: (d) => (d.topic ? `Knowledge gap assigned: ${d.topic}` : "A knowledge gap was assigned to you"),
  component: Email,
  previewData: { topic: "Returns process for damaged pallets", priority: "high", gapUrl: APP_URL },
});
export default Email;
