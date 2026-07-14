import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Self-hosted</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          The Windows installation is the product.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          OPSQAI is installed on the customer's Windows Server. Data, documents,
          embeddings, users and AI provider all live inside the customer's
          environment. OPSQAI Cloud is used only when the installation needs it —
          for license activation, update checks and support.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link to="/contact">Request installation package</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/documentation">Read documentation</Link>
          </Button>
        </div>
      </section>

      {/* Data flow */}
      <section className="border-y border-border/60 bg-surface-1">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Data flow</p>
          <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight">
            Everything flows inside the customer boundary.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
            The diagram below is the entire operational path. Only license
            heartbeat and update checks cross the boundary — and they carry no
            operational content.
          </p>

          <div className="mt-10 flex flex-col items-center gap-2">
            {FLOW.map((f, i) => (
              <div key={f.label} className="w-full max-w-md flex flex-col items-center">
                <Card className="w-full p-4 border-border/60 flex items-center gap-4">
                  <f.icon className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{f.label}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.body}</p>
                  </div>
                </Card>
                {i < FLOW.length - 1 && (
                  <ArrowDown className="h-4 w-4 text-primary/60 my-1" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-4">
            <Card className="p-5 border-border/60">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-primary" />
                <div className="font-semibold text-sm">
                  What crosses the boundary
                </div>
              </div>
              <ul className="mt-3 text-xs text-muted-foreground leading-relaxed space-y-1.5 list-disc list-inside">
                <li>Signed license activation</li>
                <li>Update manifest checks</li>
                <li>Support (opt-in, initiated by the customer)</li>
              </ul>
            </Card>
            <Card className="p-5 border-border/60">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <div className="font-semibold text-sm">
                  What never leaves
                </div>
              </div>
              <ul className="mt-3 text-xs text-muted-foreground leading-relaxed space-y-1.5 list-disc list-inside">
                <li>Documents, SOPs, procedures</li>
                <li>Embeddings and vector index</li>
                <li>Chat messages and AI audit records</li>
                <li>Users, roles and organization configuration</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <Card key={p.title} className="p-6 border-border/60">
              <p.icon className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold">{p.title}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-surface-1 border-y border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">System requirements</h2>
          <ul className="mt-6 space-y-2">
            {REQUIREMENTS.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Get the signed installer.</h2>
        <p className="mt-3 text-muted-foreground">
          Existing customers download from the Customer Portal. New customers,
          contact us for a licensed evaluation.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Button asChild>
            <Link to="/contact">Contact sales</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/security">Security overview</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
