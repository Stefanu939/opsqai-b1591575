import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";
import {
  Shield,
  Lock,
  KeyRound,
  FileCheck2,
  Database,
  Users,
  ScrollText,
  Server,
  ShieldCheck,
  Fingerprint,
  BadgeCheck,
  History,
} from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () =>
    pageHead({
      title: "Security — OPSQAI · Sovereign by design",
      description:
        "Ed25519-signed licenses, signed activation bundles with 90-day validity, hash-chained audit trail, CRL, chunk-level ACL and customer data ownership. OPSQAI never sees operational knowledge.",
      path: "/security",
      keywords:
        "OPSQAI security, Ed25519 licenses, activation bundle, hash-chained audit, CRL, chunk-level ACL, GDPR",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Security", path: "/security" },
      ],
    }),
  component: SecurityPage,
});

const PILLARS = [
  { icon: KeyRound, title: "Ed25519-signed licenses", body: "Every license is an Ed25519-signed bundle. The install verifies it locally, offline. Revocation is durable and cryptographically bound to the installation identity." },
  { icon: BadgeCheck, title: "Signed activation bundles", body: "Activation bundles are signed by OPSQAI with a 90-day validity window. Expired bundles are refused; renewal is issued through the Customer Portal." },
  { icon: History, title: "Hash-chained audit trail", body: "Privileged and AI actions are appended to a hash-chained audit log. Any tampering breaks the chain and is detected on the next verification pass." },
  { icon: Shield, title: "CRL — certificate revocation list", body: "OPSQAI maintains a signed CRL for licenses and activation bundles. The install checks it on heartbeat and refuses revoked artifacts." },
  { icon: Lock, title: "Chunk-level ACL", body: "Retrieval is enforced at the chunk level. Users only see grounded citations from documents their role and department allow." },
  { icon: Fingerprint, title: "Customer owns the data", body: "Documents, embeddings, chats, users and configuration are stored inside the customer install. OPSQAI never sees operational customer knowledge." },
  { icon: FileCheck2, title: "Signed releases", body: "Installer packages and update manifests are signed. The updater refuses any artifact that fails verification." },
  { icon: Database, title: "Encryption in transit and at rest", body: "TLS everywhere via Caddy. PostgreSQL storage encryption follows the customer's Windows Server policy. Backups can be encrypted end-to-end." },
  { icon: ScrollText, title: "Append-only audit log", body: "License issuance, ownership transfer, admin promotion, module activation — every privileged action is logged with actor, target and timestamp." },
  { icon: Users, title: "Role-based access", body: "Workspace owner, admin, manager, supervisor, worker, viewer. Platform Super Admin is a separate, tightly-scoped role held only by OPSQAI staff." },
  { icon: Server, title: "Single-tenant boundary", body: "Every install is one customer. No shared databases, no shared vector stores, no shared AI keys — nothing crosses tenants." },
  { icon: ShieldCheck, title: "GDPR aligned", body: "EU-hosted cloud surfaces, DPA available on request, right-to-erasure procedures documented for both cloud metadata and on-prem content." },
];

function SecurityPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Security</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          Security you can verify, not just trust.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          OPSQAI is sovereign by design. Operational knowledge stays on the
          customer's Windows Server. Signed artifacts prove provenance. Every
          privileged action is recorded in a hash-chained audit log.
        </p>
        <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5 text-sm text-foreground/90 leading-relaxed max-w-3xl">
          <span className="font-semibold text-primary">Guarantee: </span>
          OPSQAI never sees operational customer knowledge. Documents, chats,
          embeddings and users live inside the customer install.
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <Card key={p.title} className="p-5 border-border/60">
              <p.icon className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold text-sm">{p.title}</div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{p.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-surface-1 border-y border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Cloud vs. on-prem data</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card className="p-5 border-border/60">
              <div className="font-semibold text-sm">Cloud (OPSQAI-managed)</div>
              <ul className="mt-3 text-xs text-muted-foreground leading-relaxed space-y-1.5">
                <li>Customer & installation metadata</li>
                <li>License records and signing keys</li>
                <li>Release manifests and CRL</li>
                <li>Support conversations</li>
              </ul>
            </Card>
            <Card className="p-5 border-border/60">
              <div className="font-semibold text-sm">On-prem (Customer-owned)</div>
              <ul className="mt-3 text-xs text-muted-foreground leading-relaxed space-y-1.5">
                <li>Documents, SOPs and embeddings</li>
                <li>Chat messages and AI audit records</li>
                <li>End-user accounts and roles</li>
                <li>Workspace configuration and AI keys</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Need a DPA or security questionnaire?</h2>
        <p className="mt-3 text-muted-foreground">
          We respond to security reviews from procurement, InfoSec and
          compliance teams.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/contact">Contact us</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
