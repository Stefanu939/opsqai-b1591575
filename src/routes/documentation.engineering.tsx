import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { DocPage, DocSection } from "@/components/docs/doc-page";

export const Route = createFileRoute("/documentation/engineering")({
  head: () => pageHead({ title: "Engineering Handbook — OPSQAI Documentation", description: "OPSQAI engineering conventions for Windows releases, product architecture, signed licenses, migrations and verification.", path: "/documentation/engineering", breadcrumbs: [{ name: "Home", path: "/" }, { name: "Documentation", path: "/documentation" }, { name: "Engineering", path: "/documentation/engineering" }] }), component: Engineering,
});

function Engineering() {
  return <DocPage eyebrow="Book 6" title="Engineering Handbook" intro="Public engineering principles for extending OPSQAI without weakening product, entitlement or customer-data boundaries.">
    <DocSection id="conventions" title="1. Conventions"><ul className="list-disc pl-6 space-y-1"><li>Strict typed application code and explicit server boundaries.</li><li>Semantic design tokens and the active documented visual language.</li><li>Every new public data table includes grants, row-level security and policies.</li><li>No private key or provider credential is shipped to the browser.</li></ul></DocSection>
    <DocSection id="architecture" title="2. Product architecture"><p>The canonical sequence is Core Platform → Company Profile → Enabled Products → Optional Add-ons → Effective Configuration → Visible Workspaces. Legacy module names are compatibility inputs, not a second catalogue.</p></DocSection>
    <DocSection id="workspaces" title="3. Adding a Product Workspace"><p>Workspaces belong to a canonical OPSQAI Product, reuse Core context, and appear only after entitlement and role checks. New workspaces must represent implemented domain behavior rather than invented ERP, TMS, HRIS or accounting functionality.</p></DocSection>
    <DocSection id="licenses" title="4. Issuing a license"><p>Management Center selects an existing company, shows its Company Profile and enabled Products, and issues an Ed25519-signed JWT. Reissuing distributes changed entitlements; Self-Hosted validates and activates the bundle locally.</p></DocSection>
    <DocSection id="ai" title="5. AI providers"><p>AI access stays behind the provider abstraction. Ollama supports fully local operation; other approved providers are installation configuration. Features must preserve language, grounding, access and audit requirements.</p></DocSection>
    <DocSection id="releases" title="6. Windows releases"><p>The release pipeline produces signed Windows installation and update packages. Customer Portal exposes only authorized release material; Self-Hosted verifies and applies updates through its supported operational flow.</p></DocSection>
    <DocSection id="checklist" title="7. Verification"><ul className="list-disc pl-6 space-y-1"><li>Architecture and entitlement tests pass.</li><li>Windows packaging and boundary checks pass.</li><li>Fresh install and upgrade health checks pass.</li><li>License preview, activation and audit history work.</li><li>Public documentation matches the implemented product.</li></ul></DocSection>
  </DocPage>;
}
