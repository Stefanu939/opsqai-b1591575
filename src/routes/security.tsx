import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
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
  Cloud,
  HardDrive,
} from "lucide-react";
import { OixLayout } from "@/components/oix/oix-layout";
import { Scene3D } from "@/components/three/scene-3d";
import { ServerMonolith } from "@/components/three/primitives/server-monolith";
import { GridFloor } from "@/components/three/primitives/grid-floor";
import { GoldBloom } from "@/components/three/primitives/gold-bloom";
import { EmberFog } from "@/components/three/primitives/ember-fog";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { MottoBand } from "@/components/oix/motto-band";

export const Route = createFileRoute("/security")({
  head: () =>
    pageHead({
      title: "Security — OPSQAI · Sovereign by design",
      description:
        "Ed25519-signed licenses, signed activation bundles, hash-chained audit trail, CRL, chunk-level ACL. OPSQAI never sees operational knowledge.",
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
  { icon: History, title: "Hash-chained audit trail", body: "Privileged and AI actions are appended to a hash-chained audit log. Any tampering breaks the chain and is detected on verification." },
  { icon: Shield, title: "Certificate revocation list", body: "OPSQAI maintains a signed CRL for licenses and activation bundles. The install checks it on heartbeat and refuses revoked artifacts." },
  { icon: Lock, title: "Chunk-level ACL", body: "Retrieval is enforced at the chunk level. Users only see grounded citations from documents their role and department allow." },
  { icon: Fingerprint, title: "Customer owns the data", body: "Documents, embeddings, chats, users and configuration are stored inside the customer install. OPSQAI never sees operational customer knowledge." },
  { icon: FileCheck2, title: "Signed releases", body: "Installer packages and update manifests are signed. The updater refuses any artifact that fails verification." },
  { icon: Database, title: "Encryption in transit and at rest", body: "TLS everywhere via Caddy. PostgreSQL storage follows Windows Server policy. Backups can be encrypted end-to-end." },
  { icon: ScrollText, title: "Append-only audit log", body: "License issuance, ownership transfer, admin promotion, module activation — every privileged action is logged with actor, target and timestamp." },
  { icon: Users, title: "Role-based access", body: "Workspace owner, admin, manager, supervisor, worker, viewer. Platform Super Admin is a separate, tightly-scoped OPSQAI role." },
  { icon: Server, title: "Single-tenant boundary", body: "Every install is one customer. No shared databases, vector stores or AI keys — nothing crosses tenants." },
  { icon: ShieldCheck, title: "GDPR aligned", body: "EU-hosted cloud surfaces, DPA available on request, right-to-erasure procedures documented for both cloud metadata and on-prem content." },
];

function SecurityPage() {
  return (
    <OixLayout>
      {/* Cinematic hero — vault of signatures */}
      <section className="relative isolate min-h-[90vh] overflow-hidden border-b border-[var(--oix-gold-line)]/40">
        <div className="absolute inset-0 -z-10">
          <Scene3D cameraPosition={[0, 1.6, 6]} cameraFov={40}>
            <ambientLight intensity={0.3} />
            <pointLight position={[4, 3, 4]} intensity={1.1} color="#c9a84c" />
            <pointLight position={[-4, 2, 2]} intensity={0.6} color="#0d7a5f" />
            <GridFloor />
            <EmberFog />
            <ServerMonolith />
            <GoldBloom />
          </Scene3D>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 60% at 70% 40%, rgba(4,10,8,0) 0%, rgba(4,10,8,0.9) 82%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 md:px-10 pt-32 pb-24 md:pt-40 md:pb-32 grid md:grid-cols-2 gap-12 items-center">
          <div className="hidden md:block" />
          <div>
            <EditorialHeadline
              as="h1"
              size="xl"
              eyebrow="Security · Verifiable"
              serifAccent="not just trusted."
            >
              Proven
            </EditorialHeadline>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
              OPSQAI is sovereign by design. Operational knowledge stays on the
              customer&apos;s Windows Server. Signed artifacts prove provenance.
              Every privileged action is recorded in a hash-chained audit log.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <OixButton to="/contact?subject=security" variant="gold" withArrow>
                Request DPA / security review
              </OixButton>
              <OixButton to="/self-hosted" variant="ghost">
                Sovereign architecture
              </OixButton>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantee statement */}
      <SectionShell className="oix-hairline-bottom">
        <div className="max-w-3xl">
          <div className="oix-eyebrow mb-6">The guarantee</div>
          <p className="oix-display text-[clamp(1.75rem,3.5vw,3rem)] leading-[1.1] text-[var(--oix-cream)]">
            OPSQAI never sees operational customer knowledge.{" "}
            <span className="oix-serif-italic normal-case tracking-normal text-[var(--oix-gold-soft)]">
              Documents, chats, embeddings and users live inside the customer install.
            </span>
          </p>
        </div>
      </SectionShell>

      {/* Twelve pillars */}
      <SectionShell>
        <EditorialHeadline eyebrow="Twelve pillars" serifAccent="by construction.">
          Security
        </EditorialHeadline>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <Card
              key={p.title}
              className="p-6 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/50 backdrop-blur"
            >
              <p.icon className="h-6 w-6 text-[var(--oix-gold)]" />
              <div className="mt-4 font-semibold text-[var(--oix-cream)]">{p.title}</div>
              <p className="mt-2 text-sm text-[var(--oix-cream)]/65 leading-relaxed">{p.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <MottoBand size="lg" compact />

      {/* Boundary — cloud vs on-prem */}
      <SectionShell className="oix-hairline-top oix-hairline-bottom">
        <EditorialHeadline eyebrow="The boundary" serifAccent="stays.">
          What crosses. What
        </EditorialHeadline>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <Card className="p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60">
            <div className="flex items-center gap-3">
              <Cloud className="h-6 w-6 text-[var(--oix-gold)]" />
              <div className="font-semibold text-[var(--oix-cream)]">Cloud · OPSQAI-managed</div>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-[var(--oix-cream)]/70 leading-relaxed">
              <li>· Customer &amp; installation metadata</li>
              <li>· License records and signing keys</li>
              <li>· Release manifests and CRL</li>
              <li>· Support conversations</li>
            </ul>
          </Card>
          <Card className="p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60">
            <div className="flex items-center gap-3">
              <HardDrive className="h-6 w-6 text-[var(--oix-emerald-glow)]" />
              <div className="font-semibold text-[var(--oix-cream)]">On-prem · Customer-owned</div>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-[var(--oix-cream)]/70 leading-relaxed">
              <li>· Documents, SOPs and embeddings</li>
              <li>· Chat messages and AI audit records</li>
              <li>· End-user accounts and roles</li>
              <li>· Workspace configuration and AI keys</li>
            </ul>
          </Card>
        </div>
      </SectionShell>

      {/* Final CTA */}
      <SectionShell>
        <div className="text-center max-w-3xl mx-auto">
          <EditorialHeadline
            align="center"
            eyebrow="Procurement, InfoSec, compliance"
            serifAccent="here."
          >
            Bring your questionnaire
          </EditorialHeadline>
          <p className="mt-6 text-[var(--oix-cream)]/70">
            We respond to security reviews from procurement, InfoSec and compliance teams.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <OixButton to="/contact?subject=security" variant="gold" withArrow>
              Contact security
            </OixButton>
            <OixButton to="/self-hosted" variant="ghost">
              Self-hosted architecture
            </OixButton>
          </div>
        </div>
      </SectionShell>
    </OixLayout>
  );
}
