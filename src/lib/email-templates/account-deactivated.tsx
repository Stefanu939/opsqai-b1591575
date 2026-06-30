import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: { firstName?: string; deactivatedAt?: string; reason?: string }) => (
  <SimpleEmail
    preview="Your OPSQAI account was deactivated"
    title="Your account was deactivated"
    intro={`Hi${p.firstName ? ` ${p.firstName}` : ""} — your OPSQAI account has been deactivated. You won't be able to sign in until an administrator reactivates it.`}
    rows={[
      ...(p.deactivatedAt ? [{ label: "Deactivated", value: p.deactivatedAt }] : []),
      ...(p.reason ? [{ label: "Reason", value: p.reason }] : []),
    ]}
    cta={{ label: "Contact administrator", url: `${APP_URL}/contact?subject=support` }}
  />
);
export const template = defineTemplate({
  displayName: "Account deactivated",
  subject: "Your OPSQAI account was deactivated",
  component: Email,
  previewData: { firstName: "Jane", deactivatedAt: new Date().toLocaleString(), reason: "Requested by workspace admin" },
});
export default Email;
