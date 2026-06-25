import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";

export const Route = createFileRoute("/trust/encryption")({
  head: () => ({ meta: [
    { title: "Encryption — OPSQAI Trust Center" },
    { name: "description", content: "OPSQAI encrypts data in transit with TLS 1.2+ and at rest on managed cloud storage." },
    { property: "og:title", content: "Encryption — OPSQAI Trust Center" },
      { property: "og:url", content: "https://opsqai.de/trust/encryption" },
      { property: "og:description", content: "OPSQAI encrypts data in transit with TLS 1.2+ and at rest on managed cloud storage." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/trust/encryption" }],
  }),
  component: () => (
    <TrustTopic
      title="Encryption"
      intro="OPSQAI encrypts data both in transit and at rest using industry-standard algorithms provided by managed cloud platforms."
    >
      <h2>In transit</h2>
      <ul>
        <li>All public traffic to <code>opsqai.de</code>, <code>opsqai.de</code> and the application origin is served over <strong>TLS 1.2+</strong> with modern cipher suites.</li>
        <li>HTTP requests are redirected to HTTPS; HSTS is enabled on production.</li>
        <li>Database and storage calls between the application and the managed backend use TLS within the cloud provider's network.</li>
      </ul>
      <h2>At rest</h2>
      <ul>
        <li>Application database (PostgreSQL) is encrypted at rest using AES-256 on the managed platform.</li>
        <li>Object storage for knowledge-base files is encrypted at rest by the provider.</li>
        <li>Automated backups are encrypted with the same standard as the primary database.</li>
      </ul>
      <h2>Key management</h2>
      <ul>
        <li>Disk and storage encryption keys are managed by the cloud provider; OPSQAI does not handle raw key material.</li>
        <li>Application secrets (API keys, service-role keys, signing secrets) are stored in managed secret storage and are never committed to source control or shipped to the browser.</li>
      </ul>
      <h2>Application-layer cryptography</h2>
      <p>Webhook payloads are verified with HMAC-SHA256 and timing-safe comparison. User passwords are hashed by the authentication provider (bcrypt-family). OPSQAI does not invent its own crypto.</p>
    </TrustTopic>
  ),
});
