import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { DocPage, DocSection, DocCode } from "@/components/docs/doc-page";

export const Route = createFileRoute("/documentation/architecture")({
  head: () =>
    pageHead({
      title: "Architecture Handbook — OPSQAI Documentation",
      description:
        "How OPSQAI is built end to end: containers, data flow, license system, RAG pipeline, storage adapters, deployment topology.",
      path: "/documentation/architecture",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Documentation", path: "/documentation" },
        { name: "Architecture Handbook", path: "/documentation/architecture" },
      ],
    }),
  component: Architecture,
});

function Architecture() {
  return (
    <DocPage
      eyebrow="Book 2"
      title="Architecture Handbook"
      intro="OPSQAI is a self-hosted, multi-tenant knowledge and workflow platform delivered as a small set of container images. This book explains what runs where, how data moves, and how the components stay isolated."
    >
      <DocSection id="topology" title="1. Deployment topology">
        <DocCode>{`                +-------------------+
  Users  --->   |  Reverse proxy    |   TLS
                |  (Caddy/Traefik)  |
                +---------+---------+
                          |
                +---------v---------+       +---------------+
                |   opsqai-web      | <---> |   postgres    |  pgvector
                |   (SSR + API)     |       +---------------+
                +---------+---------+
                          |                 +---------------+
                          +---------------> |   redis       |  queue
                          |                 +---------------+
                +---------v---------+       +---------------+
                |   opsqai-worker   | <---> |   minio / S3  |  documents + backups
                |   (jobs, RAG)     |       +---------------+
                +-------------------+`}</DocCode>
      </DocSection>

      <DocSection id="containers" title="2. Containers">
        <ul className="list-disc pl-6 space-y-1">
          <li><code>opsqai-web</code> — TanStack Start (React 19 + Vite 7) SSR, server functions for all app APIs.</li>
          <li><code>opsqai-worker</code> — Node runtime pulling jobs from Redis: document ingestion, embeddings, backups, license refresh.</li>
          <li><code>postgres:16</code> + <code>pgvector</code> — primary store, RLS on every tenant table.</li>
          <li><code>redis:7</code> — BullMQ queues and short-lived caches.</li>
          <li><code>minio</code> — default S3 backend; swappable for external S3 or Azure Blob at install time.</li>
        </ul>
      </DocSection>

      <DocSection id="data-flow" title="3. Data flow — a document question">
        <ol className="list-decimal pl-6 space-y-1">
          <li>User uploads a PDF via the Portal → <code>opsqai-web</code> writes bytes to S3 and a row to <code>documents</code>.</li>
          <li><code>opsqai-web</code> enqueues an <code>ingest</code> job.</li>
          <li><code>opsqai-worker</code> pulls the job, extracts text, chunks it, requests embeddings from the configured AI provider, writes <code>document_chunks</code> with <code>embedding vector(1536)</code>.</li>
          <li>User asks a question → <code>opsqai-web</code> embeds the query, runs <code>ORDER BY embedding &lt;-&gt; :q LIMIT 8</code> under the tenant's RLS policy, and passes the top chunks as context to the AI provider.</li>
          <li>The answer streams back to the user with inline citations pointing to the source chunks.</li>
        </ol>
      </DocSection>

      <DocSection id="license" title="4. License system">
        <p>Licenses are Ed25519-signed JSON tokens issued by the Management Center. Every OPSQAI boot verifies the signature offline against a pinned public key; the worker refreshes entitlements every 24h against <code>mc.opsqai.de</code>. A grace window keeps the instance running for 14 days if the MC is unreachable.</p>
        <p>Modules, seat counts and expiry live in the token; nothing about the customer's data leaves the install.</p>
      </DocSection>

      <DocSection id="security-model" title="5. Security model">
        <ul className="list-disc pl-6 space-y-1">
          <li>Every app query runs as the authenticated user; RLS is the enforcement boundary.</li>
          <li>Server functions requiring auth use the <code>requireSupabaseAuth</code> middleware; admin server functions verify roles via a security-definer <code>has_role()</code> before touching the admin client.</li>
          <li>Roles live in <code>public.user_roles</code> — never on <code>profiles</code>.</li>
          <li>Object storage uses per-tenant path prefixes plus signed URLs; direct bucket access is blocked at the proxy.</li>
        </ul>
      </DocSection>

      <DocSection id="ai" title="6. AI adapter">
        <p>The AI layer is behind a single interface: <code>chat(messages, opts)</code>, <code>embed(texts)</code>, <code>stream(messages, opts)</code>. Adapters ship for Lovable AI Gateway, Azure OpenAI, OpenAI-compatible, and Ollama. Switching provider is a config change, not a code change.</p>
      </DocSection>

      <DocSection id="updates" title="7. Updates & maintenance">
        <p>Each release is a signed compose bundle plus SQL migrations. Migrations run behind a Postgres advisory lock so multi-replica upgrades are safe. Schema changes are always backward-compatible for one minor version to allow rolling upgrades.</p>
      </DocSection>
    </DocPage>
  );
}
