import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";
import { Shield, Lock, KeyRound, FileCheck2, Database, Users, ScrollText, Server } from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () =>
    pageHead({
      title: "Security — OPSQAI",
      description:
        "OPSQAI's security posture: signed artifacts, RLS per tenant, EU hosting for cloud surfaces, self-hosted deployment for customer data, and append-only audit logs.",
      path: "/security",
      keywords: "OPSQAI security, GDPR, RLS, signed installer, signed license, audit log, encryption",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Security", path: "/security" },
      ],
    }),
  component: SecurityPage,
});

const PILLARS = [
  { icon: Server, title: "Self-hosted by default", body: "Customer data lives inside your Windows install. The cloud surfaces (Management Center, Customer Portal) never see chat content, documents, or embeddings." },
  { icon: Lock, title: "Row-level security", body: "Every tenant table enforces RLS scoped to the workspace. Cross-tenant reads are impossible even for platform admins on the customer surfaces." },
  { icon: KeyRound, title: "Signed licenses", body: "Licenses are Ed25519-signed bundles. The install verifies them offline. Revocation is durable and cryptographically tied to install identity." },
  { icon: FileCheck2, title: "Signed releases", body: "Installer packages and update manifests are signed. The updater refuses any artifact that fails verification." },
  { icon: Database, title: "Encryption in transit and at rest", body: "TLS everywhere via Caddy. PostgreSQL storage encryption follows your Windows Server policy. Backups can be encrypted end-to-end." },
  { icon: ScrollText, title: "Append-only audit log", body: "Every privileged action — license issuance, ownership transfer, admin promotion — is written to an append-only audit log with actor, target, and timestamp." },
  { icon: Users, title: "Role-based access", body: "Workspace owner, admin, manager, supervisor, worker, viewer. Platform Super Admin is a separate, tightly-scoped role held only by OPSQAI staff." },
  { icon: Shield, title: "GDPR aligned", body: "EU-hosted cloud surfaces, DPA available on request, right-to-erasure procedures documented for both cloud metadata and on-prem content." },
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
          OPSQAI is designed so the smallest possible surface handles your data. Content stays on
          your Windows Server. Signed artifacts prove provenance. Every privileged action is
          recorded.
        </p>
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
                <li>Release manifests</li>
                <li>Support conversations</li>
              </ul>
            </Card>
            <Card className="p-5 border-border/60">
              <div className="font-semibold text-sm">On-prem (Customer-owned)</div>
              <ul className="mt-3 text-xs text-muted-foreground leading-relaxed space-y-1.5">
                <li>Documents, SOPs, and embeddings</li>
                <li>Chat messages and AI audit records</li>
                <li>End-user accounts and roles</li>
                <li>Workspace configuration</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Need a DPA or security questionnaire?</h2>
        <p className="mt-3 text-muted-foreground">
          We respond to security reviews from procurement, InfoSec, and compliance teams.
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
