import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";

export const Route = createFileRoute("/trust/iso-27001-roadmap")({
  head: () => ({ meta: [
    { title: "ISO 27001 Roadmap — OPSQAI Trust Center" },
    { name: "description", content: "OPSQAI's roadmap toward ISO/IEC 27001 alignment: current controls, gap items and target timeline." },
    { property: "og:title", content: "ISO 27001 Roadmap — OPSQAI Trust Center" },
  ]}),
  component: () => (
    <TrustTopic
      title="ISO 27001 Roadmap"
      intro="OPSQAI is not currently ISO/IEC 27001 certified. This page tracks the controls already in place and the work in progress to align with the standard."
    >
      <h2>Already in place</h2>
      <ul>
        <li>Documented access control (role-based, RLS-enforced) — see <a href="/trust/multi-tenant-isolation">Multi-tenant isolation</a>.</li>
        <li>Encryption in transit and at rest — see <a href="/trust/encryption">Encryption</a>.</li>
        <li>Audit logging of sensitive actions — see <a href="/trust/audit-logs">Audit logs</a>.</li>
        <li>Documented backup and restore process — see <a href="/trust/backup-policy">Backup policy</a>.</li>
        <li>Documented incident-response process — see <a href="/trust/incident-response">Incident response</a>.</li>
        <li>Subprocessor inventory and DPA — see <a href="/trust">Trust Center</a>.</li>
      </ul>
      <h2>In progress</h2>
      <ul>
        <li>Formal ISMS scope statement and Statement of Applicability (SoA).</li>
        <li>Risk register with periodic review cadence.</li>
        <li>Asset inventory and data-flow diagrams maintained as living documents.</li>
        <li>Vendor assessment template for subprocessors.</li>
        <li>Annual penetration test and remediation tracking.</li>
        <li>Public status page.</li>
      </ul>
      <h2>Target timeline</h2>
      <p>OPSQAI is planning a Stage 1 readiness review in 2026 with an accredited auditor, targeting Stage 2 within the following 6–9 months. Dates depend on customer demand and will be updated here as they firm up.</p>
      <h2>Customer information requests</h2>
      <p>Until certification, OPSQAI responds to security questionnaires using the public Trust Center as the source of record. For specific controls not covered here, email <a href="mailto:notify@opsqai.de">notify@opsqai.de</a>.</p>
    </TrustTopic>
  ),
});
