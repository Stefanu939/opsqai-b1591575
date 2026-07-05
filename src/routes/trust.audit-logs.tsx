import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";

export const Route = createFileRoute("/trust/audit-logs")({
  head: () => ({ meta: [
    { title: "Audit Logs — OPSQAI Trust Center" },
    { name: "description", content: "OPSQAI records questions, sources, document changes, role changes and admin actions in a per-tenant audit log." },
    { property: "og:title", content: "Audit Logs — OPSQAI Trust Center" },
      { property: "og:url", content: "https://opsqai.de/trust/audit-logs" },
      { property: "og:description", content: "OPSQAI records questions, sources, document changes, role changes and admin actions in a per-tenant audit log." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/trust/audit-logs" }],
  }),
  component: () => (
    <TrustTopic
      title="Audit Logs"
      intro="OPSQAI maintains an append-only audit log per tenant. Admins can review what was asked, what sources were used and what changed in their workspace."
    >
      <h2>What is recorded</h2>
      <ul>
        <li>Questions asked in chat, the sources surfaced and which documents were cited.</li>
        <li>Knowledge-base uploads, re-indexings and deletions.</li>
        <li>FAQ promotions from internal requests.</li>
        <li>Role and membership changes.</li>
        <li>Admin actions: invite, deactivate, password reset.</li>
      </ul>
      <h2>What is not recorded</h2>
      <ul>
        <li>Passwords, password hashes or session tokens.</li>
        <li>The raw response from the AI model — we store the sources and the visible answer, not provider-side telemetry.</li>
      </ul>
      <h2>Access</h2>
      <ul>
        <li>Tenant admins and managers can review their tenant's audit log in the admin area.</li>
        <li>Audit rows are scoped by <code>company_id</code> and locked down with row-level security.</li>
        <li>Platform super-admins can review audit logs across tenants for incident response only; this access is itself logged.</li>
      </ul>
      <h2>Retention</h2>
      <p>
        Audit logs are retained for the lifetime of the tenant subscription. When a tenant is terminated,
        audit entries are anonymized on purge — module, action, resource, severity, success and event
        timestamp are kept under a hashed tenant label in a separate archive; user IDs and payloads are not
        archived. See <a href="/trust/data-retention">Data retention</a> for the full 30-day termination flow.
      </p>
    </TrustTopic>
  ),
});
