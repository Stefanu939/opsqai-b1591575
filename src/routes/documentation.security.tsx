import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { DocPage, DocSection } from "@/components/docs/doc-page";

export const Route = createFileRoute("/documentation/security")({
  head: () =>
    pageHead({
      title: "Security Documentation — OPSQAI",
      description:
        "Encryption, authentication, authorization, license security, update signing, backup encryption, audit logging, DR/BC and incident response for OPSQAI self-hosted.",
      path: "/documentation/security",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Documentation", path: "/documentation" },
        { name: "Security", path: "/documentation/security" },
      ],
    }),
  component: Security,
});

function Security() {
  return (
    <DocPage
      eyebrow="Book 4"
      title="Security Documentation"
      intro="OPSQAI is designed to be operated by risk-averse teams. This book documents the controls that ship in every self-hosted install."
    >
      <DocSection id="encryption" title="1. Encryption">
        <ul className="list-disc pl-6 space-y-1">
          <li><b>In transit</b> — HTTPS terminated at the reverse proxy; internal traffic on a private Docker network.</li>
          <li><b>At rest</b> — Postgres data volumes and object bucket should be on encrypted volumes (LUKS, BitLocker, cloud KMS).</li>
          <li><b>Application-level</b> — sensitive fields (SMTP passwords, provider keys, backup encryption keys) are AEAD-encrypted with <code>OPSQAI_MASTER_KEY</code> before they hit Postgres.</li>
        </ul>
      </DocSection>

      <DocSection id="authn" title="2. Authentication">
        <p>Email + password with Argon2id hashing, optional Google OAuth, optional SAML/OIDC SSO. Session tokens are HTTP-only cookies bound to origin. Refresh rotation on every request. Password reset uses single-use signed tokens with a 30-minute TTL.</p>
      </DocSection>

      <DocSection id="authz" title="3. Authorization">
        <p>Every tenant table has Row-Level Security enabled. Roles live in a dedicated <code>public.user_roles</code> table and are read through a <code>SECURITY DEFINER</code> function to prevent recursive policy checks. Admin server functions verify the caller's role under RLS <b>before</b> escalating to the service-role client.</p>
      </DocSection>

      <DocSection id="license-security" title="4. License security">
        <p>License tokens are Ed25519-signed. The public key is pinned in the image. Tampering invalidates the token; a missing MC does not unlock features — it only extends the last-verified state for 14 days.</p>
      </DocSection>

      <DocSection id="update-security" title="5. Update signing">
        <p>Every release bundle and every container image is signed with cosign. The Administrator Guide instructs operators to verify the signature before running <code>docker compose up</code>. Public keys are published on <code>opsqai.de/security</code>.</p>
      </DocSection>

      <DocSection id="backups" title="6. Backup security">
        <p>Backups are encrypted with a per-instance key derived from <code>OPSQAI_MASTER_KEY</code> using HKDF. Restore requires the same key — losing it is unrecoverable, by design.</p>
      </DocSection>

      <DocSection id="audit" title="7. Audit logging">
        <p>Every privileged action (license activation, role change, backup restore, config change, sign-in from a new device) writes a row to <code>audit_log</code> with actor, target, before/after diff and IP. The log is append-only and cannot be edited from the UI.</p>
      </DocSection>

      <DocSection id="dr" title="8. DR / BC">
        <p>Recommended RPO 24h, RTO 4h with the default nightly backup schedule. Operators can tighten both by enabling continuous WAL archiving to S3 and standing up a warm standby — the compose file has a documented <code>standby</code> profile.</p>
      </DocSection>

      <DocSection id="incident" title="9. Incident response">
        <p>Report suspected vulnerabilities to <code>security@opsqai.de</code>. Responsible disclosure policy on <code>opsqai.de/security</code>. Coordinated CVEs will be published in the release notes and cross-linked from the Customer Portal.</p>
      </DocSection>
    </DocPage>
  );
}
