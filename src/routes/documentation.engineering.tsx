import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { DocPage, DocSection, DocCode } from "@/components/docs/doc-page";

export const Route = createFileRoute("/documentation/engineering")({
  head: () =>
    pageHead({
      title: "Engineering Handbook — OPSQAI Documentation",
      description:
        "Conventions, release process, adding modules, issuing licenses, adding AI adapters, publishing container images, migrations, and the pre-release checklist.",
      path: "/documentation/engineering",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Documentation", path: "/documentation" },
        { name: "Engineering", path: "/documentation/engineering" },
      ],
    }),
  component: Engineering,
});

function Engineering() {
  return (
    <DocPage
      eyebrow="Book 6"
      title="Engineering Handbook"
      intro="Internal playbook for the OPSQAI engineering team. Public copy so integrators and auditors know how the sausage is made."
    >
      <DocSection id="conventions" title="1. Conventions">
        <ul className="list-disc pl-6 space-y-1">
          <li>TypeScript strict everywhere. No <code>any</code>, no <code>@ts-ignore</code> without a linked issue.</li>
          <li>Server logic in <code>createServerFn</code>; public HTTP under <code>src/routes/api/public/</code>.</li>
          <li>Design tokens only — no hard-coded colours in components.</li>
          <li>Every new <code>public</code> table ships with <code>GRANT</code>s, <code>ENABLE RLS</code>, and policies in the same migration.</li>
        </ul>
      </DocSection>

      <DocSection id="release" title="2. Release process">
        <ol className="list-decimal pl-6 space-y-1">
          <li>Merge to <code>main</code> → CI builds and signs <code>opsqai-web</code>, <code>opsqai-worker</code>, <code>postgres-pgvector</code> images with cosign.</li>
          <li>Tagging <code>vX.Y.Z</code> promotes the images and publishes <code>opsqai-stack.tgz</code> to <code>dl.opsqai.de/selfhost/X.Y.Z/</code>.</li>
          <li>Release notes generated from Conventional Commits; CVEs linked explicitly.</li>
          <li>Managed Cloud rolls forward within 24h; self-host customers pull on their own schedule.</li>
        </ol>
      </DocSection>

      <DocSection id="modules" title="3. Adding a module">
        <ol className="list-decimal pl-6 space-y-1">
          <li>Add a feature flag key to <code>src/lib/license/features.ts</code>.</li>
          <li>Create routes under <code>src/routes/_authenticated/app.&lt;module&gt;.*.tsx</code>.</li>
          <li>Register the module in the Portal sidebar behind <code>hasFeature('module')</code>.</li>
          <li>Ship migrations with GRANT + RLS.</li>
          <li>Update the Product and Technical books.</li>
        </ol>
      </DocSection>

      <DocSection id="licenses" title="4. Issuing a license">
        <DocCode>{`# In the Management Center
mc license issue \\
  --customer "Acme GmbH" \\
  --modules chat,knowledge,tickets \\
  --seats 25 \\
  --expires 2027-01-01 \\
  --out acme.opsqai.license`}</DocCode>
        <p>The MC signs the JSON payload with the release Ed25519 key and stores the issuance in the audit trail.</p>
      </DocSection>

      <DocSection id="adapters" title="5. Adding an AI adapter">
        <ol className="list-decimal pl-6 space-y-1">
          <li>Implement <code>AiAdapter</code> under <code>src/lib/ai/&lt;name&gt;.ts</code>.</li>
          <li>Register in <code>src/lib/ai/registry.ts</code>.</li>
          <li>Add a wizard step field set + Doctor probe.</li>
          <li>Document env vars in the Administrator Guide.</li>
        </ol>
      </DocSection>

      <DocSection id="images" title="6. Publishing container images">
        <p>Images are pushed to <code>ghcr.io/opsqai/*</code>, signed with cosign keyless via OIDC in CI. SBOMs (CycloneDX) are attached to every image and mirrored to <code>dl.opsqai.de/sbom/</code>.</p>
      </DocSection>

      <DocSection id="migrations" title="7. Migrations">
        <p>SQL migrations live under <code>supabase/migrations/</code>. Rules: one logical change per migration, always backwards-compatible for one minor version, never destructive without a two-step deprecation window. Every new public table needs GRANT + RLS in the same file.</p>
      </DocSection>

      <DocSection id="checklist" title="8. Pre-release checklist">
        <ul className="list-disc pl-6 space-y-1">
          <li>Migrations reviewed for RLS + GRANT coverage.</li>
          <li>Doctor probes green on a fresh install and on the upgrade path.</li>
          <li>Backup + restore rehearsed against the release image.</li>
          <li>SBOM published; cosign signatures verified.</li>
          <li>Release notes + upgrade notes drafted.</li>
        </ul>
      </DocSection>
    </DocPage>
  );
}
