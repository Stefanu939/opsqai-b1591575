import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: { sopTitle?: string; dueAt?: string; sopUrl?: string }) => (
  <SimpleEmail
    preview={`Acknowledgement required: ${p.sopTitle ?? "SOP"}`}
    title="Please acknowledge this SOP"
    intro={`You're required to review and acknowledge "${p.sopTitle ?? "an SOP"}" in your workspace.`}
    rows={p.dueAt ? [{ label: "Due", value: p.dueAt }] : []}
    cta={{ label: "Review & acknowledge", url: p.sopUrl ?? `${APP_URL}/app/knowledge` }}
  />
);
export const template = defineTemplate({
  displayName: "SOP acknowledgement requested",
  subject: (d) => (d.sopTitle ? `Acknowledge: ${d.sopTitle}` : "Please acknowledge an SOP"),
  component: Email,
  previewData: { sopTitle: "Forklift safety v3", dueAt: "Jul 7, 2026", sopUrl: APP_URL },
});
export default Email;
