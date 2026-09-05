import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { DocPage, DocSection } from "@/components/docs/doc-page";

export const Route = createFileRoute("/documentation/product")({
  head: () => pageHead({ title: "Product Documentation — OPSQAI", description: "The OPSQAI Operational AI Platform for Windows Self-Hosted environments. Core Platform, licensed products, add-ons, grounded AI and support services.", path: "/documentation/product", breadcrumbs: [{ name: "Home", path: "/" }, { name: "Documentation", path: "/documentation" }, { name: "Product", path: "/documentation/product" }] }), component: Product,
});

function Product() {
  return <DocPage eyebrow="Book 3" title="Product Documentation" intro="OPSQAI is a Windows Self-Hosted operational AI platform. It combines governed knowledge, AI, learning, compliance and domain workspaces inside the customer's own environment.">
    <DocSection id="model" title="1. Product model"><p>The Core Platform provides shared capabilities. A Company Profile describes the operating context and recommends relevant OPSQAI Products. OPSQAI explicitly enables purchased Products and optional Add-ons; signed entitlements determine the effective configuration visible in Self-Hosted.</p></DocSection>
    <DocSection id="core" title="2. Core Platform"><p>Core includes shared capabilities such as AI Chat, Knowledge Base, SOPs, FAQ, Academy, AI Audit, Knowledge Gaps, Calendar, internal collaboration, reports, compliance, organization, users and roles, support, updates, and License & Entitlements. Core capabilities are not individually purchasable, but the installation remains license-controlled.</p></DocSection>
    <DocSection id="products" title="3. OPSQAI Products"><p>Licensed domain products provide workspaces for Operations, Quality & Compliance, Logistics, HR, Finance and Inventory. Navigation appears only where both the signed entitlement and the user's role allow access. A Company Profile recommends products but never activates them automatically.</p></DocSection>
    <DocSection id="licensing" title="4. Licensing"><p>Management Center issues an Ed25519-signed JWT containing customer identity and entitlements. Self-Hosted validates it locally, previews changes before activation, and records activation history. Compatibility claims keep older licenses readable during migration.</p></DocSection>
    <DocSection id="grounding" title="5. Grounded AI"><p>OPSQAI retrieves permitted customer knowledge as context for answers and preserves source information. The configured AI provider can be Ollama for a fully local model or another approved provider selected by the customer.</p></DocSection>
    <DocSection id="services" title="6. Services around the product"><p>Customer Portal supports designated contacts with authorized downloads, activation material, release information and tickets. Management Center is used only by OPSQAI staff to administer customers, products, licenses, installations and releases. Neither is the customer product.</p></DocSection>
  </DocPage>;
}
