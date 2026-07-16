import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { DocPage, DocSection, DocCode } from "@/components/docs/doc-page";

export const Route = createFileRoute("/documentation/technical")({
  head: () =>
    pageHead({
      title: "Technical Reference — OPSQAI Documentation",
      description:
        "docker-compose reference, environment variables, ports, volumes, AI adapter contract, RAG pipeline internals, embeddings, storage adapters, public API, jobs, and schema.",
      path: "/documentation/technical",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Documentation", path: "/documentation" },
        { name: "Technical Reference", path: "/documentation/technical" },
      ],
    }),
  component: Technical,
});

function Technical() {
  return (
    <DocPage
      eyebrow="Book 5"
      title="Technical Reference"
      intro="Reference material for developers and SREs integrating with or operating OPSQAI at a low level."
    >
      <DocSection id="compose" title="1. docker-compose.yml (excerpt)">
        <DocCode>{`services:
  web:
    image: ghcr.io/opsqai/opsqai-web:\${OPSQAI_VERSION}
    env_file: .env
    ports: ["8080:8080"]
    depends_on: [postgres, redis, minio]

  worker:
    image: ghcr.io/opsqai/opsqai-worker:\${OPSQAI_VERSION}
    env_file: .env
    depends_on: [postgres, redis, minio]

  postgres:
    image: ghcr.io/opsqai/postgres-pgvector:16
    environment:
      POSTGRES_USER: opsqai
      POSTGRES_DB: opsqai
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine

  minio:
    image: minio/minio:latest
    command: server /data --console-address :9001
    volumes: [objects:/data]

volumes:
  pgdata:
  objects:`}</DocCode>
      </DocSection>

      <DocSection id="ports" title="2. Ports">
        <ul className="list-disc pl-6 space-y-1">
          <li><code>8080</code> — <code>opsqai-web</code> HTTP (put behind TLS proxy).</li>
          <li><code>5432</code> — Postgres (do not expose externally).</li>
          <li><code>6379</code> — Redis (internal only).</li>
          <li><code>9000 / 9001</code> — MinIO API / console (internal only).</li>
        </ul>
      </DocSection>

      <DocSection id="volumes" title="3. Persistent volumes">
        <ul className="list-disc pl-6 space-y-1">
          <li><code>pgdata</code> — Postgres. Back this up. Do not delete on upgrade.</li>
          <li><code>objects</code> — MinIO bucket. Back this up. Migrate to external S3 in production.</li>
        </ul>
      </DocSection>

      <DocSection id="adapter" title="4. AI adapter contract">
        <DocCode>{`export interface AiAdapter {
  chat(messages: Message[], opts: ChatOpts): Promise<ChatResult>;
  stream(messages: Message[], opts: ChatOpts): AsyncIterable<Chunk>;
  embed(texts: string[]): Promise<number[][]>;
}`}</DocCode>
        <p>Ship a new provider by implementing this interface and registering it in <code>src/lib/ai/registry.ts</code>. All rate limiting, retries, and cost accounting are handled by the wrapping layer.</p>
      </DocSection>

      <DocSection id="rag" title="5. RAG pipeline">
        <ol className="list-decimal pl-6 space-y-1">
          <li>Extract — PDF / DOCX / HTML → normalised text.</li>
          <li>Chunk — recursive splitter, ~800 tokens with 120-token overlap.</li>
          <li>Embed — batched to the configured adapter, 1536-dim vectors.</li>
          <li>Store — <code>document_chunks(embedding vector(1536))</code> with an IVFFlat index.</li>
          <li>Retrieve — <code>&lt;-&gt;</code> cosine, top-k=8, MMR re-rank optional.</li>
          <li>Generate — pass chunks + question as system context; response cites chunk ids.</li>
        </ol>
      </DocSection>

      <DocSection id="storage" title="6. Storage adapters">
        <ul className="list-disc pl-6 space-y-1">
          <li><code>s3</code> — MinIO, AWS S3, Cloudflare R2, Backblaze B2.</li>
          <li><code>azure-blob</code> — Azure Storage v2.</li>
          <li><code>filesystem</code> — POSIX path (single-node only; not recommended for HA).</li>
        </ul>
      </DocSection>

      <DocSection id="api" title="7. Public HTTP API">
        <p>External integrations use <code>/api/public/*</code> routes with signed webhook secrets. See <code>src/routes/api/public/</code> for the current surface. Server functions (RPC) are for the app UI and are not part of the stability contract.</p>
      </DocSection>

      <DocSection id="jobs" title="8. Background jobs">
        <ul className="list-disc pl-6 space-y-1">
          <li><code>document.ingest</code></li>
          <li><code>document.embed</code></li>
          <li><code>backup.run</code> — nightly at 03:00 local, configurable.</li>
          <li><code>license.refresh</code> — every 24h.</li>
          <li><code>audit.rollup</code> — hourly.</li>
        </ul>
      </DocSection>

      <DocSection id="schema" title="9. Core schema (public)">
        <ul className="list-disc pl-6 space-y-1">
          <li><code>companies</code>, <code>profiles</code>, <code>user_roles</code></li>
          <li><code>documents</code>, <code>document_chunks</code></li>
          <li><code>conversations</code>, <code>messages</code></li>
          <li><code>tickets</code>, <code>workflows</code>, <code>workflow_runs</code></li>
          <li><code>platform_config</code>, <code>audit_log</code>, <code>license</code></li>
        </ul>
        <p>Every table has RLS enabled and explicit <code>GRANT</code>s to <code>authenticated</code> / <code>service_role</code>. See migrations for exact policies.</p>
      </DocSection>
    </DocPage>
  );
}
