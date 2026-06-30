import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: { firstName?: string; workspaceName?: string }) => (
  <SimpleEmail
    preview="Welcome to OPSQAI"
    title={`Welcome${p.firstName ? `, ${p.firstName}` : ""}`}
    intro={`Your OPSQAI workspace${p.workspaceName ? ` (${p.workspaceName})` : ""} is ready. Open the app to set up your team, knowledge base and Academy paths.`}
    cta={{ label: "Open OPSQAI", url: `${APP_URL}/app` }}
  />
);
export const template = defineTemplate({
  displayName: "Welcome",
  subject: "Welcome to OPSQAI",
  component: Email,
  previewData: { firstName: "Jane", workspaceName: "ACME Logistics" },
});
export default Email;
