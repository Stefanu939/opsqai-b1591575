import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead, softwareApplicationLd } from "@/lib/seo";
import {
  Building2,
  Users,
  HardDrive,
  ShoppingCart,
  Download,
  Key,
  Cog,
  Play,
} from "lucide-react";

export const Route = createFileRoute("/product")({
  head: () =>
    pageHead({
      title: "Product — OPSQAI · One platform, three surfaces",
      description:
        "OPSQAI is one product with three surfaces: the Windows Self-Hosted product (the actual product), the Management Center used only by OPSQAI, and the Customer Portal used by customer contacts.",
      path: "/product",
      keywords:
        "enterprise operational AI platform, windows self-hosted, customer portal, management center, signed license, windows installer",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Product", path: "/product" },
      ],
      jsonLd: [
        softwareApplicationLd({
          description:
            "OPSQAI is a Windows Self-Hosted Enterprise Operational AI Platform. Cloud surfaces exist only to support the installation.",
        }),
      ],
    }),
  component: ProductPage,
});

const SURFACES = [
  {
    icon: Building2,
    name: "Management Center",
    who: "OPSQAI staff only",
    tag: "Cloud",
    what: "Internal control plane. Companies, customers, installations, licenses, releases, signing keys, activation bundles, contracts, support, ownership, portal administration, audit and system health. Never sold, never installed, never accessed by customers.",
  },
  {
    icon: Users,
    name: "Customer Portal",
    who: "Customer contacts",
    tag: "Cloud",
    what: "Service surface at opsqai.de. Download the installer, download updates, retrieve the activation bundle, read documentation and release notes, see subscription information and open support tickets. Not the product — a service layer around it.",
  },
  {
    icon: HardDrive,
    name: "Self-Hosted",
    who: "End users, every day",
    tag: "Windows · The product",
    what: "The Windows Self-Hosted installation is the product. AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Users, Organization, Subscription, Updates and Modules — running inside the customer's own Windows Server.",
  },
];

const JOURNEY = [
  { icon: ShoppingCart, title: "Purchase", body: "Order the Basic Platform and any premium modules through OPSQAI." },
  { icon: Download, title: "Download package", body: "Retrieve the signed Windows installation package from the Customer Portal." },
  { icon: Play, title: "Run installer", body: "The installer provisions PostgreSQL, storage, services and Caddy on Windows Server." },
  { icon: Key, title: "Activate license", body: "Paste the Ed25519-signed license bundle issued by OPSQAI. Modules unlock as licensed." },
  { icon: Cog, title: "Configure AI", body: "Choose the AI provider — OpenAI, Azure OpenAI, Ollama, OpenRouter or a compatible endpoint." },
  { icon: HardDrive, title: "Start using OPSQAI", body: "Invite users, ingest SOPs and answer operational questions with grounded citations." },
];

function ProductPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Product</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          One product. Three surfaces.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          OPSQAI is a Windows Self-Hosted product. The two cloud surfaces —
          Management Center and Customer Portal — exist only to support the
          installation. Employees never work inside the cloud; they work inside
          their own installation.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {SURFACES.map((s) => (
            <Card key={s.name} className="p-6 border-border/60 flex flex-col">
              <s.icon className="h-6 w-6 text-primary" />
              <div className="mt-4 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                {s.tag}
              </div>
              <div className="mt-1 font-semibold">{s.name}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                {s.who}
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.what}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5 text-sm text-foreground/85 leading-relaxed">
          <span className="font-semibold text-primary">The product is the Windows installation.</span>{" "}
          OPSQAI Cloud is used only for licensing, releases, installer
          distribution, customer support, the Customer Portal and the
          Management Center.
        </div>
      </section>

      <section className="bg-surface-1 border-y border-border/60">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            From purchase to production
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            No SaaS subscription. A one-time Basic Platform, premium modules
            purchased separately, and Annual Maintenance.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {JOURNEY.map((j, i) => (
              <Card key={j.title} className="p-5 border-border/60">
                <div className="flex items-center gap-2 text-xs font-mono text-primary">
                  <j.icon className="h-4 w-4" />
                  STEP {i + 1}
                </div>
                <div className="mt-2 font-semibold text-sm">{j.title}</div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{j.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Ready to see the architecture live?</h2>
        <p className="mt-3 text-muted-foreground">
          Talk to us about a reference install of the Windows Self-Hosted product.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Button asChild>
            <Link to="/contact">Contact sales</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/self-hosted">Self-hosted details</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
