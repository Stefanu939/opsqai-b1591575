import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";

export const Route = createFileRoute("/trust/availability")({
  head: () => ({ meta: [
    { title: "Availability — OPSQAI Trust Center" },
    { name: "description", content: "OPSQAI's availability target, the architectural choices that support it and how degradations are communicated." },
    { property: "og:title", content: "Availability — OPSQAI Trust Center" },
  ]}),
  component: () => (
    <TrustTopic
      title="Availability"
      intro="OPSQAI runs on a global edge runtime with a managed regional database. We target high availability and design the application to degrade gracefully when upstream services are unhealthy."
    >
      <h2>Target</h2>
      <ul>
        <li><strong>Monthly availability target:</strong> 99.9% for the application surface (chat, knowledge base, FAQ).</li>
        <li><strong>Excluded:</strong> scheduled maintenance windows announced at least 48 hours in advance, and upstream third-party outages outside our control.</li>
      </ul>
      <h2>How we get there</h2>
      <ul>
        <li><strong>Edge runtime:</strong> Static and SSR pages served from a multi-region edge network; the application keeps loading even if one region is degraded.</li>
        <li><strong>Managed database:</strong> Automatic failover and continuous backups on the managed Postgres platform.</li>
        <li><strong>AI fallback:</strong> The chat endpoint cleanly surfaces upstream model errors instead of crashing the UI.</li>
        <li><strong>No single browser dependency:</strong> The PWA shell is cached so navigation between installed pages keeps working during brief network hiccups.</li>
      </ul>
      <h2>Status & communication</h2>
      <ul>
        <li>Material incidents are announced to tenant admins by email and on this Trust Center.</li>
        <li>A public status endpoint is planned (see <a href="/trust/iso-27001-roadmap">ISO 27001 roadmap</a>).</li>
      </ul>
      <h2>Maintenance</h2>
      <p>Maintenance is performed using migrations that are designed to be backwards-compatible for a release cycle. We avoid breaking schema changes during business hours.</p>
    </TrustTopic>
  ),
});
