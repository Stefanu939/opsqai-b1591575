import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: { firstName?: string; question?: string; requestUrl?: string; referenceId?: string }) => (
  <SimpleEmail
    preview="Your internal request was received"
    title="We received your internal request"
    intro={`Thanks${p.firstName ? `, ${p.firstName}` : ""} — your question has been routed to your team's managers. You'll be notified when it's answered.`}
    rows={[
      ...(p.referenceId ? [{ label: "Reference", value: p.referenceId }] : []),
      ...(p.question ? [{ label: "Question", value: p.question }] : []),
    ]}
    cta={{ label: "Track in app", url: p.requestUrl ?? `${APP_URL}/app/requests` }}
  />
);
export const template = defineTemplate({
  displayName: "Internal request created",
  subject: "Your internal request was received",
  component: Email,
  previewData: { firstName: "Jane", question: "What's the process for damaged returns?", referenceId: "IRQ-12AB", requestUrl: APP_URL },
});
export default Email;
