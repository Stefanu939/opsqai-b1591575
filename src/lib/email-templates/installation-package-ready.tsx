import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";

interface Props {
  company_name?: string;
  install_id?: string;
  installer_version?: string;
  downloadUrl?: string;
  expiresAt?: string;
  regenerated?: boolean;
}

const Email = (p: Props) => (
  <SimpleEmail
    preview={p.regenerated ? "Your regenerated OPSQAI installation package is ready" : "Your OPSQAI installation package is ready"}
    title={p.regenerated ? "Installation package regenerated" : "Your installation package is ready"}
    intro={
      p.regenerated
        ? `A new installation package for ${p.company_name ?? "your OPSQAI install"} has been generated. The download link below is valid for 24 hours.`
        : `The installation package for ${p.company_name ?? "your OPSQAI install"} is ready. The download link below is valid for 24 hours.`
    }
    rows={[
      { label: "Install ID", value: p.install_id ?? "—" },
      { label: "Installer version", value: p.installer_version ?? "—" },
      { label: "Link expires", value: p.expiresAt ?? "in 24 hours" },
    ]}
    cta={{ label: "Download installation package", url: p.downloadUrl ?? `${APP_URL}/portal/downloads` }}
    footer="If the link has expired, sign in to the Customer Portal and download from there. Every download is logged for audit."
  />
);

export const template = defineTemplate({
  displayName: "Installation package ready",
  subject: (d) =>
    d.regenerated
      ? `Installation package regenerated for ${d.company_name ?? "your OPSQAI install"}`
      : `Your OPSQAI installation package is ready`,
  component: Email,
  previewData: {
    company_name: "Acme GmbH",
    install_id: "acme-prod",
    installer_version: "1.0.0",
    downloadUrl: `${APP_URL}/portal/downloads`,
    expiresAt: "in 24 hours",
    regenerated: false,
  },
});

export default Email;
