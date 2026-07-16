import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { DocPage, DocSection, DocCode } from "@/components/docs/doc-page";

export const Route = createFileRoute("/documentation/administrator-guide")({
  head: () =>
    pageHead({
      title: "Administrator Guide — OPSQAI for Windows Server",
      description:
        "Install, configure and operate OPSQAI Self-Hosted on Windows Server: prerequisites, OPSQAI-Setup.exe, WinSW services, first-run wizard, PostgreSQL Portable, Caddy, SMTP, SSO, AI provider, licensing, backups, updates.",
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
      title="Administrator Guide — Windows Server"
      intro="Everything an operator needs to install, configure and run an OPSQAI Self-Hosted instance on a dedicated Windows Server. OPSQAI ships as a single signed OPSQAI-Setup.exe (NSIS) that stages a native Windows deployment — no Docker, no WSL, no Hyper-V. All background components run as proper Windows Services via WinSW with Event Log integration and auto-restart."
    >
      <DocSection id="prerequisites" title="1. Prerequisites">
        <p>A dedicated 64-bit Windows Server host:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><b>OS:</b> Windows Server 2019, 2022 or 2025 (Standard or Datacenter), or Windows 11 Pro for evaluation. Windows Server Core is supported.</li>
          <li><b>Hardware:</b> 4 vCPU / 8 GB RAM minimum; 8 vCPU / 16 GB RAM recommended for &gt; 25 concurrent seats.</li>
          <li><b>Disk:</b> 60 GB NTFS on <code>C:\</code> for the application; a separate volume (e.g. <code>D:\OPSQAI\Data</code>) recommended for <code>pgdata</code>, <code>objects</code> and <code>backups</code>.</li>
          <li><b>Privileges:</b> a local Administrator account to run <code>OPSQAI-Setup.exe</code> (services are installed under <code>LocalSystem</code> by default; a dedicated service account is supported).</li>
          <li><b>Network:</b> outbound HTTPS 443 to <code>mc.opsqai.de</code> for license activation and signed update manifests. No inbound Internet required.</li>
          <li><b>TLS:</b> the bundled Caddy service terminates TLS on <code>:443</code> (self-signed on first boot; replace with your corporate/AD-CS certificate via the Service Manager).</li>
          <li><b>Not required:</b> Docker Desktop, WSL2, Hyper-V, IIS, .NET, Node.js — everything is bundled in the installer payload.</li>
        </ul>
      </DocSection>

      <DocSection id="install" title="2. Install with OPSQAI-Setup.exe">
        <p>Download the signed installer from the Customer Portal, verify the Authenticode signature, then run it on the target server:</p>
        <DocCode>{`# PowerShell 7 (Administrator)
# 1. Verify Authenticode signature (issuer: OPSQAI GmbH, EV code-signing)
Get-AuthenticodeSignature .\\OPSQAI-Setup.exe | Format-List Status, SignerCertificate

# 2. Interactive install
.\\OPSQAI-Setup.exe

# 2b. Silent / unattended install (see docs/unattended-install.md)
.\\OPSQAI-Setup.exe /S /D=C:\\Program Files\\OPSQAI`}</DocCode>
        <p>
          The installer stages the payload under <code>C:\Program Files\OPSQAI</code>, provisions data
          folders under <code>C:\ProgramData\OPSQAI</code> (or your chosen data volume), registers the
          Windows Services listed below, and opens the first-run wizard on <code>https://localhost</code>.
        </p>
      </DocSection>

      <DocSection id="services" title="3. Windows Services (WinSW)">
        <p>Each service is a WinSW-wrapped Node process registered with the Service Control Manager. Manage them with <code>sc.exe</code>, <code>Get-Service</code>, or the bundled OPSQAI Service Manager.</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><code>OpsqaiCaddy</code> — Caddy reverse proxy, terminates TLS on <code>:443</code>, forwards to the platform on <code>127.0.0.1:8080</code>.</li>
          <li><code>OpsqaiPlatform</code> — TanStack Start SSR + API (the web application).</li>
          <li><code>OpsqaiWorker</code> — background jobs: RAG indexing, embeddings, scheduled backups.</li>
          <li><code>OpsqaiDatabase</code> — PostgreSQL 16 Portable with <code>pgvector</code>, <code>scram-sha-256</code> auth, data in <code>ProgramData\OPSQAI\pgdata</code>.</li>
          <li><code>OpsqaiUpdater</code> — polls <code>mc.opsqai.de</code> for signed update manifests (Ed25519); applies updates only on operator confirmation.</li>
        </ul>
        <DocCode>{`Get-Service Opsqai*
Restart-Service OpsqaiPlatform
Get-EventLog -LogName Application -Source OpsqaiPlatform -Newest 20`}</DocCode>
      </DocSection>

      <DocSection id="first-run" title="4. First-run wizard">
        <p>After install, open <code>https://localhost</code> on the server (or your DNS name once the certificate is replaced). The wizard is single-use and self-seals when it completes. Steps:</p>
        <ol className="list-decimal pl-6 space-y-1">
          <li><b>EULA</b> — accept the OPSQAI Self-Hosted licence agreement.</li>
          <li><b>License</b> — Ed25519 token issued by the Management Center; paste as-is.</li>
          <li><b>Database</b> — use the bundled <code>OpsqaiDatabase</code> service, or point at an external PostgreSQL 15+ with <code>pgvector</code>.</li>
          <li><b>Object storage</b> — local NTFS folder (default: <code>D:\OPSQAI\Data\objects</code>), external S3, or Azure Blob.</li>
          <li><b>AI provider</b> — Lovable AI Gateway, Azure OpenAI, OpenAI-compatible endpoint, or local Ollama.</li>
          <li><b>SMTP</b> — host, port, TLS mode, username, password, from-address.</li>
          <li><b>SSO (optional)</b> — SAML or OIDC metadata URL; can be configured post-install.</li>
          <li><b>Backup destination</b> — local path, S3, Azure Blob, or SMB/NAS.</li>
          <li><b>Doctor</b> — end-to-end probe (DB, storage, SMTP, AI, license, TLS).</li>
          <li><b>First platform admin</b> — email + password; bootstraps <code>public.user_roles</code>.</li>
        </ol>
        <p>Each step runs a Doctor probe before it accepts the value. On completion the wizard writes <code>public.platform_config.setup_completed_at</code> and the <code>/first-run</code> route becomes permanently unreachable. A lost admin uses the DR break-glass flow, not this wizard.</p>
      </DocSection>

      <DocSection id="paths" title="5. On-disk layout">
        <DocCode>{`C:\\Program Files\\OPSQAI\\           # binaries (read-only after install)
├── platform\\                        # OpsqaiPlatform Node bundle
├── worker\\                          # OpsqaiWorker Node bundle
├── caddy\\                           # caddy.exe + Caddyfile template
├── postgres\\                        # PostgreSQL 16 Portable
├── winsw\\                           # WinSW.exe + service XMLs
└── tools\\                           # opsqai.cmd, opsqai-migrate.cmd

C:\\ProgramData\\OPSQAI\\              # runtime state (writable)
├── config\\opsqai.env                # generated by the wizard (ACL: Administrators + service SID)
├── config\\secrets.env               # 0600-equivalent NTFS ACL; API keys, SMTP password
├── pgdata\\                          # PostgreSQL cluster (unless external DB)
├── objects\\                         # object storage (unless external S3/Azure)
├── backups\\                         # local backup target
├── logs\\                            # per-service rolling logs
└── tls\\                             # Caddy-managed or imported certificates`}</DocCode>
      </DocSection>

      <DocSection id="env" title="6. Configuration (opsqai.env)">
        <p>The wizard writes <code>C:\ProgramData\OPSQAI\config\opsqai.env</code>. Secrets are kept in a separate <code>secrets.env</code> file with a restricted NTFS ACL and are loaded by WinSW at service start. Edit only when services are stopped.</p>
        <DocCode>{`OPSQAI_MODE=selfhost
OPSQAI_PUBLIC_URL=https://opsqai.contoso.local

# Database (bundled PostgreSQL by default)
DATABASE_URL=postgres://opsqai@127.0.0.1:5432/opsqai

# Object storage — local NTFS
OPSQAI_OBJECT_STORE=local
OPSQAI_OBJECT_PATH=D:\\OPSQAI\\Data\\objects

# Licensing
OPSQAI_MC_URL=https://mc.opsqai.de

# Signing keys — DO NOT LOSE; backups are encrypted with this key
OPSQAI_MASTER_KEY=  # 32-byte base64, generated on first boot if empty`}</DocCode>
      </DocSection>

      <DocSection id="backups" title="7. Backups & restore">
        <p>
          <code>OpsqaiWorker</code> runs nightly logical backups of PostgreSQL (<code>pg_dump</code> custom format) and copies the object store to the configured destination. Backups are encrypted with <code>OPSQAI_MASTER_KEY</code>. Retention and schedule are set in the Service Manager.
        </p>
        <DocCode>{`# Manual backup
& "C:\\Program Files\\OPSQAI\\tools\\opsqai.cmd" backup run --now

# List snapshots
& "C:\\Program Files\\OPSQAI\\tools\\opsqai.cmd" backup list

# Restore a specific snapshot (services are stopped automatically)
& "C:\\Program Files\\OPSQAI\\tools\\opsqai.cmd" restore --snapshot 2026-07-15T03-00Z --confirm`}</DocCode>
      </DocSection>

      <DocSection id="updates" title="8. Updates">
        <p>
          <code>OpsqaiUpdater</code> polls <code>mc.opsqai.de</code> for signed update manifests (Ed25519). Updates are downloaded, signature-verified, and staged; the operator confirms application from the Service Manager (or unattended via <code>opsqai.cmd update apply</code>). Database migrations run automatically on <code>OpsqaiPlatform</code> boot behind a Postgres advisory lock.
        </p>
        <DocCode>{`# Check for updates
& "C:\\Program Files\\OPSQAI\\tools\\opsqai.cmd" update check

# Apply the staged update (stops services, migrates, restarts)
& "C:\\Program Files\\OPSQAI\\tools\\opsqai.cmd" update apply --confirm`}</DocCode>
      </DocSection>

      <DocSection id="migrate" title="9. Migrating from the legacy Docker build">
        <p>
          Customers who ran the pre-1.0 Docker Compose reference stack migrate onto Windows-native with the bundled migrator. It exports the Postgres database and object bucket from the Compose deployment, then imports them into the freshly installed Windows services.
        </p>
        <DocCode>{`# On the OLD Docker host
docker compose exec worker opsqai backup run --now --export /backup/export.opsqai

# Copy export.opsqai to the new Windows Server, then:
& "C:\\Program Files\\OPSQAI\\tools\\opsqai-migrate.cmd" `+"`\n"+`  --from C:\\Transfer\\export.opsqai --confirm`}</DocCode>
      </DocSection>

      <DocSection id="troubleshooting" title="10. Troubleshooting">
        <ul className="list-disc pl-6 space-y-1">
          <li><b>Wizard rejects license</b> — check outbound TLS to <code>mc.opsqai.de</code> and that the host clock is within 60 s of NTP (<code>w32tm /query /status</code>).</li>
          <li><b>Service will not start</b> — <code>Get-EventLog -LogName Application -Source Opsqai* -Newest 50</code>, or inspect <code>C:\ProgramData\OPSQAI\logs\&lt;service&gt;.out.log</code>.</li>
          <li><b>Caddy returns 502</b> — <code>OpsqaiPlatform</code> is not listening on <code>127.0.0.1:8080</code>; usually a migration failure — check the platform log.</li>
          <li><b>Embeddings stuck</b> — <code>Get-Content C:\ProgramData\OPSQAI\logs\worker.out.log -Tail 200</code>; verify AI provider quota.</li>
          <li><b>Doctor page</b> — <code>https://&lt;host&gt;/admin/doctor</code> re-runs every probe on demand.</li>
        </ul>
      </DocSection>
    </DocPage>
  );
}
