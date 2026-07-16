import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { DocPage, DocSection, DocCode } from "@/components/docs/doc-page";

export const Route = createFileRoute("/documentation/administrator-guide")({
  head: () =>
    pageHead({
      title: "Administrator Guide — OPSQAI Documentation",
      description:
        "Install, configure and operate OPSQAI self-hosted with Docker Compose: prerequisites, first-run wizard, PostgreSQL, object storage, SMTP, SSO, AI provider, license, backups, updates.",
      path: "/documentation/administrator-guide",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Documentation", path: "/documentation" },
        { name: "Administrator Guide", path: "/documentation/administrator-guide" },
      ],
    }),
  component: AdminGuide,
});

function AdminGuide() {
  return (
    <DocPage
      eyebrow="Book 1"
      title="Administrator Guide"
      intro="Everything an operator needs to install, configure and run an OPSQAI self-hosted instance in production. The platform ships as signed OCI images orchestrated with Docker Compose (Kubernetes manifests are available under a separate SKU)."
    >
      <DocSection id="prerequisites" title="1. Prerequisites">
        <p>Any 64-bit host that can run Docker Engine 24+ and Docker Compose v2:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Windows Server 2022 with WSL2 + Docker Desktop, or Ubuntu 22.04/24.04, RHEL 9, Debian 12.</li>
          <li>4 vCPU / 8 GB RAM minimum, 8 vCPU / 16 GB RAM recommended for &gt; 25 concurrent seats.</li>
          <li>60 GB SSD for system + volumes; separate volume for <code>pgdata</code> and <code>objects</code>.</li>
          <li>Outbound HTTPS 443 to <code>mc.opsqai.de</code> for license activation and update manifests.</li>
          <li>Reverse proxy with TLS (Caddy, Traefik, or nginx) fronting the <code>opsqai-web</code> container on <code>:8080</code>.</li>
        </ul>
      </DocSection>

      <DocSection id="install" title="2. Install with Docker Compose">
        <p>Fetch the signed compose bundle and start the stack:</p>
        <DocCode>{`# 1. Pull the release bundle
curl -fsSL https://dl.opsqai.de/selfhost/latest/opsqai-stack.tgz | tar -xz
cd opsqai-stack

# 2. Verify signature (Ed25519, key fingerprint on opsqai.de/security)
cosign verify-blob --key opsqai-release.pub \\
  --signature opsqai-stack.tgz.sig opsqai-stack.tgz

# 3. Copy env template and edit
cp .env.example .env
$EDITOR .env

# 4. Start
docker compose up -d
docker compose ps`}</DocCode>
        <p>The stack exposes the web UI on <code>http://HOST:8080</code>. Point your reverse proxy at that port and terminate TLS there.</p>
      </DocSection>

      <DocSection id="services" title="3. Services in the stack">
        <ul className="list-disc pl-6 space-y-1">
          <li><code>opsqai-web</code> — TanStack Start SSR + API, port 8080.</li>
          <li><code>opsqai-worker</code> — background jobs: RAG indexing, embeddings, backups.</li>
          <li><code>postgres</code> — Postgres 16 with pgvector, volume <code>pgdata</code>.</li>
          <li><code>minio</code> — S3-compatible object storage for documents and backups (swap for external S3/Azure Blob in production).</li>
          <li><code>redis</code> — job queue + rate limit state.</li>
        </ul>
      </DocSection>

      <DocSection id="first-run" title="4. First-run wizard">
        <p>Open the web UI at <code>/first-run</code>. The wizard is single-use and self-seals when it completes. It prompts for:</p>
        <ol className="list-decimal pl-6 space-y-1">
          <li><b>License</b> — Ed25519 token issued by the Management Center; paste as-is.</li>
          <li><b>AI provider</b> — Lovable AI Gateway, Azure OpenAI, OpenAI-compatible endpoint, or Ollama.</li>
          <li><b>SMTP</b> — host, port, TLS mode, username, password, from-address.</li>
          <li><b>Object storage</b> — internal MinIO, external S3, Azure Blob, or NAS mount.</li>
          <li><b>Backup destination</b> — S3, Azure Blob, or local path.</li>
          <li><b>First platform admin</b> — email + password; bootstraps <code>public.user_roles</code>.</li>
        </ol>
        <p>Each step runs a <b>Doctor</b> probe before it accepts the value. On completion the wizard writes <code>public.platform_config.sealed = true</code>.</p>
      </DocSection>

      <DocSection id="env" title="5. Environment reference (.env)">
        <DocCode>{`OPSQAI_MODE=selfhost
OPSQAI_PUBLIC_URL=https://opsqai.example.com

# Database
POSTGRES_PASSWORD=change-me
DATABASE_URL=postgres://opsqai:change-me@postgres:5432/opsqai

# Object storage (internal MinIO by default)
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=opsqai
S3_ACCESS_KEY=change-me
S3_SECRET_KEY=change-me

# Redis
REDIS_URL=redis://redis:6379

# License activation
OPSQAI_MC_URL=https://mc.opsqai.de
OPSQAI_LICENSE_TOKEN=

# Signing keys — do not lose these, backups depend on them
OPSQAI_MASTER_KEY=  # 32-byte base64, generated on first boot if empty`}</DocCode>
      </DocSection>

      <DocSection id="backups" title="6. Backups & restore">
        <p>The worker runs nightly logical backups of Postgres and rsyncs the object bucket to the configured destination. Backups are encrypted with <code>OPSQAI_MASTER_KEY</code>.</p>
        <DocCode>{`# Manual backup
docker compose exec worker opsqai backup run --now

# Restore a specific snapshot
docker compose exec worker opsqai restore --snapshot 2026-07-15T03:00Z --confirm`}</DocCode>
      </DocSection>

      <DocSection id="updates" title="7. Updates">
        <p>Update by pulling the next signed bundle and re-running compose. Migrations run automatically on <code>opsqai-web</code> boot behind an advisory lock, so multi-replica upgrades are safe.</p>
        <DocCode>{`curl -fsSL https://dl.opsqai.de/selfhost/latest/opsqai-stack.tgz | tar -xz
docker compose pull
docker compose up -d`}</DocCode>
      </DocSection>

      <DocSection id="troubleshooting" title="8. Troubleshooting">
        <ul className="list-disc pl-6 space-y-1">
          <li><b>Wizard rejects license</b> — check outbound TLS to <code>mc.opsqai.de</code> and that the host clock is within 60 s of NTP.</li>
          <li><b>Embeddings stuck</b> — <code>docker compose logs worker | grep embed</code>; verify AI provider quota.</li>
          <li><b>Web returns 502</b> — reverse proxy is up but <code>opsqai-web</code> is not listening; check <code>docker compose logs web</code> for migration errors.</li>
          <li><b>Doctor page</b> — <code>/admin/doctor</code> re-runs every probe on demand.</li>
        </ul>
      </DocSection>
    </DocPage>
  );
}
