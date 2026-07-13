import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: {
  firstName?: string;
  newRole?: string;
  workspaceName?: string;
  changedBy?: string;
}) => (
  <SimpleEmail
    preview="Your OPSQAI role was updated"
    title="Your role was updated"
    intro={`Hi${p.firstName ? ` ${p.firstName}` : ""} — your role in ${p.workspaceName ?? "your OPSQAI workspace"} has changed.`}
    rows={[
      { label: "New role", value: p.newRole ?? "Member" },
      ...(p.changedBy ? [{ label: "Changed by", value: p.changedBy }] : []),
    ]}
    cta={{ label: "Open OPSQAI", url: `${APP_URL}/app` }}
  />
);
export const template = defineTemplate({
  displayName: "Role changed",
  subject: "Your OPSQAI role was updated",
  component: Email,
  previewData: {
    firstName: "Jane",
    newRole: "Manager",
    workspaceName: "ACME",
    changedBy: "stefan@opsqai.de",
  },
});
export default Email;
