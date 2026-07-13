import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: {
  eventLabel?: string;
  eventAt?: string;
  deviceLabel?: string;
  ipHash?: string;
}) => (
  <SimpleEmail
    preview="OPSQAI security alert"
    title="A security event occurred on your account"
    intro={`We detected the following on your OPSQAI account: ${p.eventLabel ?? "a security-relevant action"}.`}
    rows={[
      ...(p.eventAt ? [{ label: "When", value: p.eventAt }] : []),
      ...(p.deviceLabel ? [{ label: "Device", value: p.deviceLabel }] : []),
      ...(p.ipHash ? [{ label: "Origin ID", value: p.ipHash }] : []),
    ]}
    cta={{ label: "Review account", url: `${APP_URL}/app` }}
    notice="If this wasn't you, change your password immediately and email security@opsqai.de."
  />
);
export const template = defineTemplate({
  displayName: "Security alert",
  subject: (d) =>
    d.eventLabel ? `OPSQAI security alert: ${d.eventLabel}` : "OPSQAI security alert",
  component: Email,
  previewData: {
    eventLabel: "New sign-in from an unknown device",
    eventAt: new Date().toLocaleString(),
    deviceLabel: "Chrome / macOS",
    ipHash: "ab12cd34",
  },
});
export default Email;
