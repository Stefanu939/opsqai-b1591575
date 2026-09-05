import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { DocPage, DocSection, DocCode } from "@/components/docs/doc-page";

export const Route = createFileRoute("/documentation/architecture")({
  head: () => pageHead({ title: "Architecture Handbook — OPSQAI Documentation", description: "How the OPSQAI Operational AI Platform for Windows Self-Hosted environments, signed entitlements, local data and OPSQAI support services fit together.", path: "/documentation/architecture", breadcrumbs: [{ name: "Home", path: "/" }, { name: "Documentation", path: "/documentation" }, { name: "Architecture Handbook", path: "/documentation/architecture" }] }),
  component: Architecture,
});

function Architecture() {
  return <DocPage eyebrow="Book 2" title="Architecture Handbook" intro="OPSQAI is a licensed Windows Self-Hosted operational AI platform. The installation is the customer product; cloud services distribute licenses, releases and support without becoming an employee workspace.">
    <DocSection id="topology" title="1. Product topology"><DocCode>{`OPSQAI team                Customer boundary
+-------------------+       +--------------------------------+
| Management Center | ----> | Windows Self-Hosted product    |
| licenses/releases |       | app + services + PostgreSQL    |
+-------------------+       | local knowledge + AI provider  |
          |                 +--------------------------------+
+---------v---------+
| Customer Portal   |  downloads, activation, release notes, support
+-------------------+`}</DocCode></DocSection>
    <DocSection id="boundary" title="2. Customer boundary"><p>Users work only in the Windows Self-Hosted installation. Documents, embeddings, conversations, configuration and operational records remain in the customer-controlled environment. PostgreSQL is provisioned locally by the Windows installer.</p></DocSection>
    <DocSection id="configuration" title="3. Effective configuration"><p>The canonical model is Core Platform → Company Profile → Enabled Products → Optional Add-ons → Effective Configuration → Visible Workspaces. Company Profiles recommend products; Management Center explicitly enables them; a signed license distributes the resulting entitlements.</p></DocSection>
    <DocSection id="knowledge" title="4. Grounded knowledge flow"><ol className="list-decimal pl-6 space-y-1"><li>Authorized users add governed knowledge inside their installation.</li><li>OPSQAI prepares local searchable representations with the configured AI provider.</li><li>Questions retrieve permitted sources under role and access rules.</li><li>Answers return with source context; auditing records the interaction locally.</li></ol></DocSection>
    <DocSection id="license" title="5. License system"><p>Management Center issues Ed25519-signed JWT licenses containing customer, profile, products, add-ons and compatibility claims. Self-Hosted verifies the signature locally and derives navigation and product access from the validated entitlements. Core capabilities remain part of the platform but stay license-controlled.</p></DocSection>
    <DocSection id="services" title="6. Cloud support services"><p>Management Center is an internal OPSQAI administration service. Customer Portal serves designated customer contacts with downloads, activation material, release information and support. Neither service is the customer product or an employee workspace.</p></DocSection>
    <DocSection id="updates" title="7. Updates & maintenance"><p>Windows release packages are published through the controlled release flow. Customers retrieve authorized packages through Customer Portal and apply updates according to their maintenance policy.</p></DocSection>
  </DocPage>;
}
