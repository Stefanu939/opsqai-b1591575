import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";
import { HardDrive, Shield, Database, Cpu, Server, Lock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/self-hosted")({
  head: () =>
    pageHead({
      title: "Self-Hosted — OPSQAI on Windows",
      description:
        "OPSQAI is installed on your own Windows Server. Your data, your network, your AI provider. Signed installer, signed licenses, no outbound telemetry required.",
      path: "/self-hosted",
      keywords:
        "self-hosted AI, on-premise AI, windows AI, air-gapped, private LLM, enterprise on-prem AI",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Self-hosted", path: "/self-hosted" },
      ],
    }),
  component: SelfHostedPage,
});

const PILLARS = [
  { icon: HardDrive, title: "Runs on Windows Server", body: "Windows Server 2019/2022. Installer provisions PostgreSQL, storage, services, and Caddy. WinSW manages every service." },
  { icon: Database, title: "Your data stays in your VLAN", body: "PostgreSQL + pgvector local to the install. Documents on your filesystem or object storage. No cloud round-trip for content." },
  { icon: Cpu, title: "Bring your AI provider", body: "OpenAI, Azure OpenAI, Ollama, or any OpenAI-compatible endpoint. Configured per install; can be air-gapped with local models." },
  { icon: Shield, title: "Signed everything", body: "Signed Windows installer, signed release manifests, signed license bundles. Every artifact is cryptographically verifiable." },
  { icon: Lock, title: "No forced telemetry", body: "License heartbeat is opt-in and metadata-only. Content, queries, and users never leave the install." },
  { icon: Server, title: "Disaster recovery", body: "DR bootstrap tokens, signed backups, and documented restore procedures. Your ops team can rebuild without OPSQAI." },
];

const REQUIREMENTS = [
  "Windows Server 2019 / 2022 (Standard or Datacenter)",
  "8 vCPU · 16 GB RAM · 200 GB SSD minimum",
  "Outbound HTTPS to your chosen AI provider (or none, with local models)",
  "TLS certificate for your internal domain (Caddy can also issue via ACME)",
  "Domain administrator to run the installer (elevated)",
];

function SelfHostedPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Self-hosted</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          OPSQAI runs on your infrastructure.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          Install OPSQAI on your Windows Server. Your knowledge, your identities, and your AI
          provider — inside your network. OPSQAI issues the licenses and ships the releases; you
          own the runtime.
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

      <section className="mx-auto max-w-6xl px-4 pb-16">
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
          Existing customers download from the Customer Portal. New customers, contact us for a
          licensed evaluation.
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
