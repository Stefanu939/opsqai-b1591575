import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";
import { DraftDisclaimer } from "@/components/legal/draft-disclaimer";

export const Route = createFileRoute("/trust/iso-27001-roadmap")({
  head: () => ({
    meta: [
      { title: "ISO 27001 Roadmap — OPSQAI Trust Center" },
      {
        name: "description",
        content:
          "OPSQAI's roadmap toward ISO/IEC 27001 alignment: current controls, gap items and target timeline.",
      },
      { property: "og:title", content: "ISO 27001 Roadmap — OPSQAI Trust Center" },
      { property: "og:url", content: "https://opsqai.de/trust/iso-27001-roadmap" },
      {
        property: "og:description",
        content:
          "OPSQAI's roadmap toward ISO/IEC 27001 alignment: current controls, gap items and target timeline.",
      },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/trust/iso-27001-roadmap" }],
  }),
  component: () => (
    <TrustTopic
      title="ISO 27001 Roadmap"
      intro="OPSQAI (the product and company) is not currently ISO/IEC 27001 or SOC 2 certified, and no formal certification project has been started yet. This page tracks the controls already in place and the specific work that would need to happen before certification is realistic. We do not describe OPSQAI as 'audit-ready' or 'SOC 2 Type II ready' — those labels are reserved for a concrete, named, time-bound milestone we can point to."
    >
      <DraftDisclaimer />
      <h2>Subprocessor certification (separate from OPSQAI's own status)</h2>
      <p>
        Our infrastructure subprocessor's platform (<strong>Lovable</strong>) holds{" "}
        <strong>SOC 2 Type II</strong>
        and <strong> ISO 27001:2022</strong> certifications at the company level. We are confirming
        the specific contractual coverage applicable to our subscription tier and will provide the
        relevant documentation upon request. This coverage applies to the underlying platform
        (database, authentication, storage, edge functions) — it does <strong>not</strong> mean
        OPSQAI itself is certified, and it does not eliminate OPSQAI's own responsibility as a data
        processor under Art. 28 GDPR.
      </p>
      <h2>Already in place</h2>
      <ul>
        <li>
          Documented access control (role-based, RLS-enforced) — see{" "}
          <a href="/trust/multi-tenant-isolation">Multi-tenant isolation</a>.
        </li>
        <li>
          Encryption in transit and at rest — see <a href="/trust/encryption">Encryption</a>.
        </li>
        <li>
          Audit logging of sensitive actions — see <a href="/trust/audit-logs">Audit logs</a>.
        </li>
        <li>
          Documented backup and restore process — see{" "}
          <a href="/trust/backup-policy">Backup policy</a>.
        </li>
        <li>
          Documented incident-response process — see{" "}
          <a href="/trust/incident-response">Incident response</a>.
        </li>
        <li>
          Subprocessor inventory and draft DPA — see <a href="/trust">Trust Center</a>.
        </li>
      </ul>
      <h2>Not yet started</h2>
      <p>
        The following ISO/IEC 27001 alignment items are <strong>not yet started</strong>. We list
        them as gaps rather than "in progress" because no named owner or milestone date is attached
        to them yet:
      </p>
      <ul>
        <li>Formal ISMS scope statement and Statement of Applicability (SoA).</li>
        <li>Risk register with a periodic review cadence.</li>
        <li>Asset inventory and data-flow diagrams maintained as living documents.</li>
        <li>Vendor assessment template for subprocessors.</li>
        <li>Annual penetration test and remediation tracking.</li>
        <li>Public status page.</li>
        <li>Stage 1 and Stage 2 audits with an accredited certification body.</li>
      </ul>
      <h2>Target timeline</h2>
      <p>
        No time-bound certification milestone has been fixed yet. We will only publish target dates
        once an accredited auditor is engaged and a Stage 1 review is scheduled. Until then, please
        treat any third-party summary describing OPSQAI as "SOC 2 ready" or "audit-ready" as
        inaccurate.
      </p>
      <h2>Customer information requests</h2>
      <p>
        Until certification, OPSQAI responds to security questionnaires using the public Trust
        Center as the source of record. For specific controls not covered here, email{" "}
        <a href="mailto:notify@opsqai.de">notify@opsqai.de</a>.
      </p>
    </TrustTopic>
  ),
});
