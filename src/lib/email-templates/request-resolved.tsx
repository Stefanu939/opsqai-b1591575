import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: {
  firstName?: string;
  question?: string;
  answer?: string;
  requestUrl?: string;
}) => (
  <SimpleEmail
    preview="Your internal request was answered"
    title="Your internal request was answered"
    intro={`Hi${p.firstName ? ` ${p.firstName}` : ""}, a manager answered your request${p.question ? ` "${p.question}"` : ""}.`}
    body={p.answer ? `Answer: ${p.answer}` : undefined}
    cta={{ label: "Open in app", url: p.requestUrl ?? `${APP_URL}/app/requests` }}
  />
);
export const template = defineTemplate({
  displayName: "Internal request resolved",
  subject: "Your internal request was answered",
  component: Email,
  previewData: {
    firstName: "Jane",
    question: "Damaged returns?",
    answer: "Use the new returns SOP v2 — link inside the app.",
    requestUrl: APP_URL,
  },
});
export default Email;
