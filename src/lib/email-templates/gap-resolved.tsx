import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: { topic?: string; resolvedBy?: string; sopUrl?: string }) => (
  <SimpleEmail
    preview={`Knowledge gap resolved: ${p.topic ?? "Topic"}`}
    title="A knowledge gap you raised was resolved"
    intro={`${p.resolvedBy ?? "A manager"} promoted "${p.topic ?? "your question"}" into the knowledge base.`}
    cta={{ label: "Read the new entry", url: p.sopUrl ?? `${APP_URL}/app/knowledge` }}
  />
);
export const template = defineTemplate({
  displayName: "Knowledge gap resolved",
  subject: (d) => (d.topic ? `Resolved: ${d.topic}` : "Your knowledge gap was resolved"),
  component: Email,
  previewData: { topic: "Damaged pallets process", resolvedBy: "Maria F.", sopUrl: APP_URL },
});
export default Email;
