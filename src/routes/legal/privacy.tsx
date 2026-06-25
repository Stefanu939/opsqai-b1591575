import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — OPSQAI" }, { name: "description", content: "How OPSQAI collects, uses and protects personal data." }
      { property: "og:url", content: "https://opsqai.de/legal/privacy" },
      { property: "og:description", content: "How OPSQAI collects, uses and protects personal data." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/privacy" }],
  }),
  component: () => (
    <>
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().getFullYear()}. This Privacy Policy explains how OPSQAI processes personal data when you use opsqai.de (the marketing site) and the OPSQAI application.</p>

      <h2>Who we are</h2>
      <p>OPSQAI provides an AI knowledge management platform for logistics and supply chain operations. Contact: notify@opsqai.de.</p>

      <h2>What we collect</h2>
      <ul>
        <li>Account data: name, work email, role, company, language preference.</li>
        <li>Content data: documents and FAQs uploaded by your administrators, and questions asked of the AI.</li>
        <li>Operational data: timestamps, audit logs, IP address for security purposes.</li>
        <li>Marketing site: minimal analytics on aggregate page visits; no advertising trackers.</li>
      </ul>

      <h2>Legal basis</h2>
      <ul>
        <li>Performance of contract (operating the service for your employer).</li>
        <li>Legitimate interest (security, fraud prevention, product improvement).</li>
        <li>Consent (optional analytics or marketing communications).</li>
      </ul>

      <h2>Sharing</h2>
      <p>We share data only with the subprocessors listed in our Trust Center, under contract, and as required by law. We do not sell personal data.</p>

      <h2>Retention</h2>
      <p>Account and content data are retained for the duration of the customer agreement. Audit logs are retained for up to 24 months. Backups follow standard rolling retention.</p>

      <h2>Your rights</h2>
      <p>Under the GDPR you have the right to access, rectify, erase, restrict, port or object to the processing of your personal data. Contact notify@opsqai.de to exercise these rights. You may also lodge a complaint with your local data protection authority.</p>

      <h2>International transfers</h2>
      <p>OPSQAI is operated from the EU. Where data leaves the EEA, transfers are protected by standard contractual clauses or equivalent safeguards.</p>

      <h2>Changes</h2>
      <p>We update this policy when our practices change. Material changes are notified to administrators in advance.</p>
    </>
  ),
});
