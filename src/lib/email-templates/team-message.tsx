import * as React from "react";
import { Text } from "@react-email/components";
import { BrandedEmail } from "./_layout";
import type { TemplateEntry } from "./registry";

interface Props {
  subject?: string;
  body?: string;
  sender?: string;
}

/** Internal OPSQAI team message, drafted by Kai and sent by a superadmin. */
const Email = ({ subject, body, sender }: Props) => (
  <BrandedEmail preview={subject ?? "Mesaj intern OPSQAI"} title={subject ?? "Mesaj intern OPSQAI"}>
    {(body ?? "").split(/\n{2,}/).map((p, i) => (
      <Text key={i} style={para}>
        {p}
      </Text>
    ))}
    <Text style={meta}>Trimis de {sender ?? "OPSQAI"} prin Kai · Management Center (doar uz intern)</Text>
  </BrandedEmail>
);

const para: React.CSSProperties = { fontSize: "14px", lineHeight: "22px", color: "#0f1729", margin: "0 0 12px", whiteSpace: "pre-line" };
const meta: React.CSSProperties = { fontSize: "12px", color: "#64748b", margin: "16px 0 0" };

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => String(d.subject ?? "Mesaj intern OPSQAI"),
  displayName: "Mesaj intern echipă (Kai)",
  previewData: { subject: "Ședință vineri", body: "Salut echipă,\n\nNe vedem vineri la 11:00.", sender: "stefan@opsqai.de" },
} satisfies TemplateEntry;

export default Email;
