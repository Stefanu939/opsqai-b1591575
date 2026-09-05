import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { DocPage, DocSection } from "@/components/docs/doc-page";

export const Route = createFileRoute("/documentation/security")({
  head: () => pageHead({ title: "Security Documentation — OPSQAI", description: "Security boundaries, local data, authentication, role access, signed licenses, audit and operational recovery for OPSQAI Self-Hosted.", path: "/documentation/security", breadcrumbs: [{ name: "Home", path: "/" }, { name: "Documentation", path: "/documentation" }, { name: "Security", path: "/documentation/security" }] }), component: Security,
});

function Security() {
  return <DocPage eyebrow="Book 4" title="Security Documentation" intro="OPSQAI keeps the employee product and operational knowledge inside the customer-controlled Windows environment, with explicit identity, access and entitlement boundaries.">
    <DocSection id="boundary" title="1. Data boundary"><p>Customer documents, embeddings, conversations and operational records belong to the Self-Hosted installation. Management Center and Customer Portal support licensing, distribution and support; they are not operational-data workspaces.</p></DocSection>
    <DocSection id="authn" title="2. Authentication"><p>Local users authenticate against the installation. Passwords use Argon2id; sessions are signed and validated before protected application functions run.</p></DocSection>
    <DocSection id="authz" title="3. Roles and module access"><p>SuperAdmin has full administrative access and can create additional SuperAdmins, while last-SuperAdmin protection prevents accidental lockout. Other users receive a role and explicit module access. License entitlement and role authorization are separate checks and both must pass.</p></DocSection>
    <DocSection id="license" title="4. License security"><p>License bundles are Ed25519-signed JWTs. Self-Hosted validates the signature locally before preview and activation. Invalid, expired or missing entitlements never unlock products.</p></DocSection>
    <DocSection id="audit" title="5. Audit and accountability"><p>Administrative and license operations are recorded in the installation's audit surfaces. AI Audit and source-grounded answers give operators visibility into knowledge use without moving operational content into OPSQAI Cloud.</p></DocSection>
    <DocSection id="backup" title="6. Backup and recovery"><p>Administrators are responsible for protecting local application data and backup material according to company policy. OPSQAI health and diagnostic tooling helps identify service, storage and database readiness issues.</p></DocSection>
    <DocSection id="incident" title="7. Security contact"><p>Report suspected vulnerabilities to <code>security@opsqai.de</code>. Release and remediation information is distributed through the customer support and release channels.</p></DocSection>
  </DocPage>;
}
