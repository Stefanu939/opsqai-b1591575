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
      intro="OPSQAI retains tenant data for as long as the subscription is active. After termination we provide a wind-down window for export, then delete tenant data and backups."
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
      <h2>On termination</h2>
      <ul>
        <li>Customer data is exported on request and then deleted within <strong>30 days after termination</strong>, unless a longer period is required by applicable law.</li>
        <li>After this window, the tenant row is deleted; ON DELETE CASCADE removes all related rows.</li>
        <li>Backups age out within the platform's rolling 30-day backup window after primary deletion.</li>
      </ul>
      <h2>Aggregated metrics</h2>
      <p>OPSQAI may retain anonymous, non-identifying operational metrics (such as request counts and latency) indefinitely. These contain no tenant payload data.</p>
    </TrustTopic>
  ),
});
