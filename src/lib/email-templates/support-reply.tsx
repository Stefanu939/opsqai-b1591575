import * as React from "react";
import { SimpleEmail, defineTemplate, APP_URL } from "./_simple";
const Email = (p: {
  ticketId?: string;
  replyPreview?: string;
  ticketUrl?: string;
  from?: string;
}) => (
  <SimpleEmail
    preview={`New reply on ticket ${p.ticketId ?? ""}`}
    title="You have a new reply on your support ticket"
    intro={`${p.from ?? "An OPSQAI engineer"} responded to your support ticket${p.ticketId ? ` ${p.ticketId}` : ""}.`}
    body={p.replyPreview ? `"${p.replyPreview}"` : undefined}
    cta={{ label: "View reply", url: p.ticketUrl ?? `${APP_URL}/app` }}
  />
);
export const template = defineTemplate({
  displayName: "Support reply",
  subject: (d) =>
    d.ticketId ? `New reply on ticket ${d.ticketId}` : "New reply on your support ticket",
  component: Email,
  previewData: {
    ticketId: "OPS-1042",
    from: "Stefan B.",
    replyPreview: "We've reproduced this and a fix is rolling out.",
    ticketUrl: APP_URL,
  },
});
export default Email;
