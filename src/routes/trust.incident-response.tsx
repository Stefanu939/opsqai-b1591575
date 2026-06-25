import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";

export const Route = createFileRoute("/trust/incident-response")({
  head: () => ({ meta: [
    { title: "Incident Response — OPSQAI Trust Center" },
    { name: "description", content: "How OPSQAI detects, triages, contains and communicates security incidents to affected customers." },
    { property: "og:title", content: "Incident Response — OPSQAI Trust Center" },
      { property: "og:url", content: "https://opsqai.de/trust/incident-response" },
      { property: "og:description", content: "How OPSQAI detects, triages, contains and communicates security incidents to affected customers." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/trust/incident-response" }],
  }),
  component: () => (
    <TrustTopic
      title="Incident Response"
      intro="OPSQAI runs a documented incident-response process for security and availability incidents, with defined severity levels, communication channels and post-incident review."
    >
      <h2>Detection</h2>
      <ul>
        <li>Platform-level monitoring on the managed cloud (errors, latency, auth failures).</li>
        <li>Database audit triggers for sensitive operations.</li>
        <li>External vulnerability reports via <a href="mailto:notify@opsqai.de">notify@opsqai.de</a>.</li>
      </ul>
      <h2>Severity levels</h2>
      <ul>
        <li><strong>SEV-1:</strong> confirmed unauthorized access to customer data, or full outage. Response within 1 hour, 24/7.</li>
        <li><strong>SEV-2:</strong> partial outage, degraded answer quality at scale, or a credible but unconfirmed security report. Response within 4 business hours.</li>
        <li><strong>SEV-3:</strong> minor bug, single-tenant issue, cosmetic. Triaged in the regular backlog.</li>
      </ul>
      <h2>Containment & eradication</h2>
      <ul>
        <li>Rotate credentials, revoke sessions, and disable affected integrations.</li>
        <li>Apply hotfix migrations or feature flags as needed.</li>
        <li>Preserve forensic evidence in the audit log and managed cloud logs.</li>
      </ul>
      <h2>Customer communication</h2>
      <ul>
        <li>For confirmed personal-data breaches affecting a tenant, OPSQAI notifies the tenant administrator within <strong>72 hours</strong> in line with GDPR Article 33 obligations on data processors.</li>
        <li>Status updates go to the tenant admin email on file and, for SEV-1, to <code>notify@opsqai.de</code> subscribers.</li>
      </ul>
      <h2>Post-incident review</h2>
      <p>Every SEV-1 or SEV-2 incident gets a blameless post-mortem with timeline, root cause, customer impact and remediation actions. Findings update the relevant Trust Center pages.</p>
    </TrustTopic>
  ),
});
