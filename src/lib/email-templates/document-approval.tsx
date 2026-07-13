import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: { docTitle?: string; reviewerName?: string; reviewUrl?: string }) => (
  <SimpleEmail
    preview={`Document waiting for your approval: ${p.docTitle ?? ""}`}
    title="A document is waiting for your approval"
    intro={`${p.reviewerName ?? "A team member"} submitted "${p.docTitle ?? "a document"}" for your approval.`}
    cta={{ label: "Review document", url: p.reviewUrl ?? `${APP_URL}/app/admin/customers` }}
  />
);
export const template = defineTemplate({
  displayName: "Document approval requested",
  subject: (d) =>
    d.docTitle ? `Approval requested: ${d.docTitle}` : "A document is waiting for your approval",
  component: Email,
  previewData: { docTitle: "ACME · Onboarding pack", reviewerName: "Maria F.", reviewUrl: APP_URL },
});
export default Email;
