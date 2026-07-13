import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: {
  fileName?: string;
  downloadUrl?: string;
  expiresAt?: string;
  format?: string;
}) => (
  <SimpleEmail
    preview="Your OPSQAI export is ready"
    title="Your export is ready"
    intro={`Your ${p.format ?? "document"} export${p.fileName ? ` (${p.fileName})` : ""} has finished.`}
    rows={p.expiresAt ? [{ label: "Available until", value: p.expiresAt }] : []}
    cta={{ label: "Download", url: p.downloadUrl ?? `${APP_URL}/app` }}
  />
);
export const template = defineTemplate({
  displayName: "Export ready",
  subject: (d) => (d.fileName ? `Export ready: ${d.fileName}` : "Your OPSQAI export is ready"),
  component: Email,
  previewData: {
    fileName: "knowledge-export.zip",
    format: "ZIP",
    downloadUrl: APP_URL,
    expiresAt: "in 24 hours",
  },
});
export default Email;
