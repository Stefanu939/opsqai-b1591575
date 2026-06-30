import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: { firstName?: string; changedAt?: string; ipHash?: string }) => (
  <SimpleEmail
    preview="Your OPSQAI password was changed"
    title="Your password was changed"
    intro={`Hi${p.firstName ? ` ${p.firstName}` : ""} — we're confirming a password change on your OPSQAI account.`}
    rows={[
      { label: "Changed", value: p.changedAt ?? new Date().toLocaleString() },
      ...(p.ipHash ? [{ label: "Origin ID", value: p.ipHash }] : []),
    ]}
    cta={{ label: "Review account security", url: `${APP_URL}/app` }}
    notice="If this wasn't you, reset your password immediately and contact support@opsqai.de."
  />
);
export const template = defineTemplate({
  displayName: "Password changed",
  subject: "Your OPSQAI password was changed",
  component: Email,
  previewData: { firstName: "Jane", changedAt: new Date().toLocaleString(), ipHash: "ab12cd34" },
});
export default Email;
