import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { DocPage, DocSection } from "@/components/docs/doc-page";

export const Route = createFileRoute("/documentation/product")({
  head: () =>
    pageHead({
      title: "Product Documentation — OPSQAI",
      description:
        "What OPSQAI is, why it exists, what each module does, how licensing works, and how AI answers stay grounded in your knowledge base.",
      path: "/documentation/product",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Documentation", path: "/documentation" },
        { name: "Product", path: "/documentation/product" },
      ],
    }),
  component: Product,
});

function Product() {
  return (
    <DocPage
      eyebrow="Book 3"
      title="Product Documentation"
      intro="OPSQAI is a self-hosted operations and knowledge platform. It combines a grounded AI assistant with document, ticket, workflow, and reporting modules — all running on your own infrastructure."
    >
      <DocSection id="why" title="1. Why OPSQAI exists">
        <p>Regulated industries and mid-market operators need AI that stays inside their four walls. Public assistants leak data, on-prem stacks require a team to run. OPSQAI packages a private AI + knowledge base + workflow layer as a signed container stack you deploy in an afternoon.</p>
      </DocSection>

      <DocSection id="modules" title="2. Modules">
        <ul className="list-disc pl-6 space-y-1">
          <li><b>Chat</b> — grounded conversational assistant with citations to your documents.</li>
          <li><b>Knowledge</b> — document ingestion, versioning, and vector search.</li>
          <li><b>Tickets</b> — internal helpdesk with AI triage and suggested replies.</li>
          <li><b>Workflows</b> — declarative automations that can call AI steps.</li>
          <li><b>Reports</b> — dashboards over usage, quality, cost and adoption.</li>
          <li><b>Admin</b> — users, roles, SSO, license, doctor probes, audit log.</li>
        </ul>
        <p>Modules are gated by the license token — buying a plan simply unlocks entries in the sidebar; no code redeploy.</p>
      </DocSection>

      <DocSection id="licensing" title="3. How licensing works">
        <p>An OPSQAI plan produces an Ed25519-signed license issued by the Management Center. The token embeds: customer id, modules, seat count, expiry, and any feature flags. The instance verifies the signature offline and refreshes entitlements daily. No customer data ever leaves the install.</p>
      </DocSection>

      <DocSection id="grounding" title="4. Grounded AI">
        <p>Every AI answer in OPSQAI is produced by embedding the user's question, retrieving the most relevant chunks from the tenant's own documents under RLS, and passing them as context. Answers include inline citations linking back to the source chunk. The model never sees another tenant's data.</p>
      </DocSection>

      <DocSection id="editions" title="5. Editions">
        <ul className="list-disc pl-6 space-y-1">
          <li><b>Self-Hosted</b> — the product this documentation describes. Docker Compose, all data on your infrastructure.</li>
          <li><b>Managed Cloud</b> — the same stack operated by OPSQAI on isolated EU-hosted infrastructure (single-tenant DB).</li>
        </ul>
      </DocSection>
    </DocPage>
  );
}
