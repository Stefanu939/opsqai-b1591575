import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";

const Email = (p: { alertTitle?: string; alertBody?: string; area?: string; when?: string }) => (
  <SimpleEmail
    preview="OPSQAI critical alert"
    title={p.alertTitle ?? "Critical alert in OPSQAI"}
    intro={p.alertBody ?? "An operational alert needs your attention."}
    rows={[
      ...(p.area ? [{ label: "Area", value: p.area }] : []),
      ...(p.when ? [{ label: "Raised", value: p.when }] : []),
    ]}
    cta={{ label: "Open Activity Center", url: `${APP_URL}/management/activity` }}
    notice="You receive this email because the alert is marked critical. Non-critical alerts stay inside the app."
  />
);

export const template = defineTemplate({
  displayName: "Critical alert",
  subject: (d) =>
    d.alertTitle ? `OPSQAI critical: ${d.alertTitle}` : "OPSQAI critical alert",
  component: Email,
  previewData: {
    alertTitle: "Installation offline: Nordwind Logistik",
    alertBody: "No heartbeat since 2026-09-04 03:12 UTC.",
    area: "Installation health",
    when: new Date().toLocaleString(),
  },
});
export default Email;
