import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: { sopTitle?: string; version?: string; publishedBy?: string; sopUrl?: string }) => (
  <SimpleEmail
    preview={`SOP published: ${p.sopTitle ?? "Untitled"}`}
    title="A new SOP version was published"
    intro={`${p.publishedBy ?? "A manager"} published a new version of "${p.sopTitle ?? "an SOP"}" in your workspace.`}
    rows={[
      { label: "Version", value: p.version ?? "v1" },
      ...(p.publishedBy ? [{ label: "Published by", value: p.publishedBy }] : []),
    ]}
    cta={{ label: "Review SOP", url: p.sopUrl ?? `${APP_URL}/app/knowledge` }}
  />
);
export const template = defineTemplate({
  displayName: "SOP published",
  subject: (d) => (d.sopTitle ? `SOP published: ${d.sopTitle}` : "A new SOP was published"),
  component: Email,
  previewData: { sopTitle: "Picking process v2", version: "v2", publishedBy: "Stefan B.", sopUrl: APP_URL },
});
export default Email;
