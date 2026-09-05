import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { DocPage, DocSection, DocCode } from "@/components/docs/doc-page";

export const Route = createFileRoute("/documentation/technical")({
  head: () => pageHead({ title: "Technical Reference — OPSQAI Documentation", description: "Technical reference for the OPSQAI Windows services, local PostgreSQL, AI provider boundary, signed licenses, health and updates.", path: "/documentation/technical", breadcrumbs: [{ name: "Home", path: "/" }, { name: "Documentation", path: "/documentation" }, { name: "Technical Reference", path: "/documentation/technical" }] }),
  component: Technical,
});

function Technical() {
  return <DocPage eyebrow="Book 5" title="Technical Reference" intro="Reference for teams operating and integrating the Windows Self-Hosted OPSQAI product.">
    <DocSection id="runtime" title="1. Windows runtime"><p>The signed installer provisions the application, supporting Windows services and local PostgreSQL. The desktop shell checks service health before opening the application and directs administrators to recovery information when a dependency is unavailable.</p></DocSection>
    <DocSection id="data" title="2. Local data"><ul className="list-disc pl-6 space-y-1"><li><b>PostgreSQL</b> — application records, configuration, audit data and vector-backed knowledge.</li><li><b>Installation storage</b> — customer documents, backups and release assets managed within the customer boundary.</li><li><b>Backups</b> — administrator-controlled backup and restore procedures for the local installation.</li></ul></DocSection>
    <DocSection id="ai" title="3. AI provider boundary"><DocCode>{`Self-Hosted application
  -> governed context retrieval
  -> configured AI provider
     (Ollama for a fully local model, or an approved compatible provider)
  -> source-grounded response`}</DocCode><p>The selected provider is installation configuration. OPSQAI Cloud does not receive the customer's operational knowledge.</p></DocSection>
    <DocSection id="license" title="4. Signed entitlements"><p>Licenses are Ed25519-signed JWTs. The validated profile, products, add-ons and legacy compatibility claims resolve the effective configuration and visible workspaces. Invalid or absent claims do not unlock capabilities.</p></DocSection>
    <DocSection id="health" title="5. Health and heartbeat"><p>Local readiness checks report whether required application services are available. A separate installation heartbeat may report installation status to Management Center; it does not transmit operational knowledge.</p></DocSection>
    <DocSection id="integration" title="6. Integration surface"><p>Supported integrations use authenticated application functions or documented public endpoints. Public callbacks validate their caller, input and signature before performing work.</p></DocSection>
    <DocSection id="updates" title="7. Release lifecycle"><p>Authorized Windows packages are listed through Customer Portal. The installation's Updates area and operational tooling provide the local update path and health checks.</p></DocSection>
  </DocPage>;
}
