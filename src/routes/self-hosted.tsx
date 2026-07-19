import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { pageHead } from "@/lib/seo";
import {
  HardDrive,
  Shield,
  Database,
  Cpu,
  Server,
  Lock,
  CheckCircle2,
  ArrowDown,
  Cloud,
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

export const Route = createFileRoute("/self-hosted")({
  head: () =>
    pageHead({
      title: "Self-Hosted — OPSQAI on Windows · The Product",
      description:
        "The Windows Self-Hosted installation is the product. Local PostgreSQL, pgvector, local embeddings, customer-owned AI provider. OPSQAI Cloud is used only for licensing, updates and support.",
      path: "/self-hosted",
      keywords:
        "windows self-hosted AI, on-premise AI, windows server AI, sovereign AI, private LLM, enterprise on-prem AI",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Self-hosted", path: "/self-hosted" },
      ],
    }),
  component: SelfHostedPage,
});

const PILLARS = [
  { icon: HardDrive, title: "Runs on Windows Server", body: "Windows Server 2019/2022. Installer provisions PostgreSQL, storage, services and Caddy. WinSW manages every service. No Docker, no Kubernetes, no Linux." },
  { icon: Database, title: "Local PostgreSQL + pgvector", body: "The database and vector store live inside the customer's Windows environment. Documents, chunks and embeddings never leave." },
  { icon: Cpu, title: "Customer-owned AI provider", body: "OpenAI, Azure OpenAI, Ollama, OpenRouter or any OpenAI-compatible endpoint. The customer owns the account and the keys." },
  { icon: Shield, title: "Signed everything", body: "Signed Windows installer, signed release manifests, signed license bundles. Every artifact is cryptographically verifiable." },
  { icon: Lock, title: "Single tenant by design", body: "Every install is one customer, one workspace, one boundary. Nothing is shared across customers — not databases, not embeddings, not AI keys." },
  { icon: Server, title: "Disaster recovery built in", body: "DR bootstrap tokens, signed backups and documented restore. The customer's ops team can rebuild the installation without OPSQAI in the loop." },
];

const REQUIREMENTS = [
  "Windows Server 2019 or 2022 (Standard or Datacenter)",
  "8 vCPU · 16 GB RAM · 200 GB SSD minimum",
  "Outbound HTTPS to the customer's chosen AI provider (or none, with local models)",
  "TLS certificate for the internal domain (Caddy can also issue via ACME)",
  "Domain administrator to run the installer (elevated)",
];

const FLOW = [
  { icon: Server, label: "Windows Server", body: "Customer-owned host, inside the customer's network." },
  { icon: HardDrive, label: "OPSQAI Platform", body: "Windows services managed by WinSW. The product itself." },
  { icon: Database, label: "Local PostgreSQL", body: "Relational store. Users, chats, documents, audit — all local." },
  { icon: Database, label: "pgvector", body: "Vector index inside PostgreSQL. Embeddings never leave." },
  { icon: HardDrive, label: "Local storage", body: "Documents on the customer's filesystem or object storage." },
  { icon: Cpu, label: "Customer's AI provider", body: "OpenAI, Azure OpenAI, Ollama or compatible endpoint." },
];

function SelfHostedPage() {
  return (
    <OixLayout>
      {/* Cinematic hero with rotating monolith */}
      <section className="relative isolate min-h-[90vh] overflow-hidden border-b border-[var(--oix-gold-line)]/40">
        <div className="absolute inset-0 -z-10">
          <Scene3D cameraPosition={[3.5, 1.2, 5.5]} cameraFov={42}>
            <ambientLight intensity={0.35} />
            <pointLight position={[5, 4, 5]} intensity={1.2} color="#c9a84c" />
            <pointLight position={[-4, 2, 3]} intensity={0.7} color="#0d7a5f" />
            <GridFloor />
            <EmberFog />
            <ServerMonolith />
            <GoldBloom />
          </Scene3D>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 60% at 30% 40%, rgba(4,10,8,0) 0%, rgba(4,10,8,0.85) 80%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 md:px-10 pt-32 pb-24 md:pt-40 md:pb-32 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <EditorialHeadline
              as="h1"
              size="xl"
              eyebrow="Self-Hosted · The Product"
              serifAccent="stays yours."
            >
              Your data
            </EditorialHeadline>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
              OPSQAI is installed on the customer&apos;s Windows Server. Data,
              documents, embeddings, users and AI provider all live inside the
              customer&apos;s environment. OPSQAI Cloud is used only when the
              installation needs it — for license activation, update checks and
              support. Nothing operational ever crosses the boundary.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <OixButton to="/contact" variant="gold" withArrow>
                Request installation package
              </OixButton>
              <OixButton to="/documentation" variant="ghost">
                Read documentation
              </OixButton>
            </div>
          </div>
          <div className="hidden md:block" />
        </div>
      </section>

      {/* Boundary diagram */}
      <SectionShell className="oix-hairline-bottom">
        <EditorialHeadline eyebrow="Data flow" serifAccent="the boundary.">
          Everything flows inside
        </EditorialHeadline>
        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[var(--oix-cream)]/70">
          The diagram below is the entire operational path. Only license
          heartbeat and update checks cross the boundary — and they carry no
          operational content.
        </p>

        <div className="mt-14 grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-10 items-start">
          <div className="flex flex-col items-center gap-2">
            {FLOW.map((f, i) => (
              <div key={f.label} className="w-full max-w-md flex flex-col items-center">
                <Card className="w-full p-4 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 backdrop-blur flex items-center gap-4">
                  <f.icon className="h-5 w-5 text-[var(--oix-gold)] shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[var(--oix-cream)]">{f.label}</div>
                    <p className="text-xs text-[var(--oix-cream)]/60 mt-0.5">{f.body}</p>
                  </div>
                </Card>
                {i < FLOW.length - 1 && (
                  <ArrowDown className="h-4 w-4 text-[var(--oix-gold)]/60 my-1" />
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Card className="p-5 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-[var(--oix-gold)]" />
                <div className="font-semibold text-sm text-[var(--oix-cream)]">
                  What crosses the boundary
                </div>
              </div>
              <ul className="mt-3 text-xs text-[var(--oix-cream)]/65 leading-relaxed space-y-1.5 list-disc list-inside">
                <li>Signed license activation</li>
                <li>Update manifest checks</li>
                <li>Support (opt-in, initiated by the customer)</li>
              </ul>
            </Card>
            <Card className="p-5 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-[var(--oix-emerald-glow)]" />
                <div className="font-semibold text-sm text-[var(--oix-cream)]">
                  What never leaves
                </div>
              </div>
              <ul className="mt-3 text-xs text-[var(--oix-cream)]/65 leading-relaxed space-y-1.5 list-disc list-inside">
                <li>Documents, SOPs, procedures</li>
                <li>Embeddings and vector index</li>
                <li>Chat messages and AI audit records</li>
                <li>Users, roles and organization configuration</li>
              </ul>
            </Card>
          </div>
        </div>
      </SectionShell>

      <MottoBand size="lg" compact />

      {/* Pillars */}
      <SectionShell>
        <EditorialHeadline eyebrow="Six pillars" serifAccent="by construction.">
          Sovereign
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

      {/* Requirements */}
      <SectionShell className="oix-hairline-top oix-hairline-bottom">
        <EditorialHeadline eyebrow="System requirements" serifAccent="ready.">
          Enterprise
        </EditorialHeadline>
        <ul className="mt-10 grid md:grid-cols-2 gap-3">
          {REQUIREMENTS.map((r) => (
            <li
              key={r}
              className="flex items-start gap-3 text-sm text-[var(--oix-cream)]/75 border border-[var(--oix-gold-line)]/30 rounded-none p-4 bg-[var(--oix-onyx)]/40"
            >
              <CheckCircle2 className="h-4 w-4 text-[var(--oix-gold)] shrink-0 mt-0.5" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </SectionShell>

      {/* Final CTA */}
      <SectionShell>
        <div className="text-center max-w-3xl mx-auto">
          <EditorialHeadline
            align="center"
            eyebrow="Get the signed installer"
            serifAccent="starts here."
          >
            The install
          </EditorialHeadline>
          <p className="mt-6 text-[var(--oix-cream)]/70">
            Existing customers download from the Customer Portal. New customers,
            contact us for a licensed evaluation.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <OixButton to="/contact" variant="gold" withArrow>
              Contact sales
            </OixButton>
            <OixButton to="/security" variant="ghost">
              Security overview
            </OixButton>
          </div>
        </div>
      </SectionShell>
    </OixLayout>
  );
}
