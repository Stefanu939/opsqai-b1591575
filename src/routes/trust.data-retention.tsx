import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";

export const Route = createFileRoute("/trust/data-retention")({
  head: () => ({ meta: [
    { title: "Data Retention — OPSQAI Trust Center" },
    { name: "description", content: "How long OPSQAI retains tenant data, audit logs and backups, and how deletion works on termination." },
    { property: "og:title", content: "Data Retention — OPSQAI Trust Center" },
      { property: "og:url", content: "https://opsqai.de/trust/data-retention" },
      { property: "og:description", content: "How long OPSQAI retains tenant data, audit logs and backups, and how deletion works on termination." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/trust/data-retention" }],
  }),
  component: () => (
    <TrustTopic
      title="Data Retention"
      intro="OPSQAI retains tenant data for as long as the subscription is active. On termination we provide a 30-day wind-down window, then automatically delete tenant data. Audit metadata is anonymized before archival."
    >
      <h2>Active subscription</h2>
      <ul>
        <li><strong>Knowledge base, threads, FAQs, audit logs:</strong> retained for the lifetime of the tenant.</li>
        <li><strong>Database backups:</strong> rolling 30-day backup window on the managed platform.</li>
        <li><strong>Server logs (request / error):</strong> short rolling retention (typically 14 days) for operational debugging; no application payload bodies are persisted in logs.</li>
      </ul>
      <h2>Customer-initiated deletion</h2>
      <ul>
        <li>Tenant admins can delete documents, threads and users in-app at any time. These deletions are immediate at the database layer and cascade to embeddings.</li>
        <li>Storage objects deleted from the knowledge base are removed from the object store on the same operation.</li>
      </ul>
      <h2>On termination — 30-day automated deletion</h2>
      <p>
        When a Platform Administrator marks a tenant as terminated, the tenant is placed in a
        <strong> 30-day grace window</strong>. During this window the workspace is read-only, the customer can
        request a data export, and termination can still be reversed by a Platform Administrator.
      </p>
      <ul>
        <li>
          A scheduled database job (<code>purge_terminated_tenants</code>, executed daily via <code>pg_cron</code>)
          runs after the 30-day grace window and permanently deletes the tenant record. All related rows —
          knowledge base, chunks, threads, messages, FAQs, workspaces, users, roles — are removed by
          <code> ON DELETE CASCADE</code>.
        </li>
        <li>
          Before deletion, audit-log entries are <strong>anonymized and moved to a separate archive</strong>
          (<code>audit_log_terminated_archive</code>): only module, action, resource, severity, success and
          event timestamp are kept, under a hashed tenant label. User IDs and payloads are not archived.
          The anonymized archive is retained for a <strong>rolling 24 months</strong>, then purged.
        </li>
        <li>
          Backups age out within the managed platform's rolling 30-day backup window after primary deletion,
          giving an effective maximum retention of ~60 days from the termination date.
        </li>
        <li>Longer retention applies only where required by applicable law (e.g. statutory bookkeeping obligations on billing records).</li>
      </ul>
      <h2>Aggregated metrics</h2>
      <p>OPSQAI may retain anonymous, non-identifying operational metrics (such as request counts and latency) indefinitely. These contain no tenant payload data.</p>
    </TrustTopic>
  ),
});
