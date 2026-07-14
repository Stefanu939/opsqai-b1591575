import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead, softwareApplicationLd } from "@/lib/seo";
import { Building2, Users, HardDrive, ShoppingCart, Download, Key, Cog, Play } from "lucide-react";

export const Route = createFileRoute("/product")({
  head: () =>
    pageHead({
      title: "Product — OPSQAI Platform Architecture",
      description:
        "OPSQAI is one product with three surfaces: Management Center for OPSQAI staff, Customer Portal for customer contacts, and the Self-Hosted product running in your environment.",
      path: "/product",
      keywords:
        "enterprise AI platform, self-hosted AI, customer portal, management center, license, windows installer",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Product", path: "/product" },
      ],
      jsonLd: [
        softwareApplicationLd({
          description:
            "OPSQAI is a self-hosted enterprise AI knowledge platform installed on Windows, licensed and supported by OPSQAI.",
        }),
      ],
    }),
  component: ProductPage,
});

const SURFACES = [
  {
    icon: Building2,
    name: "Management Center",
    who: "OPSQAI staff",
    what: "Control plane. Companies, licenses, installations, releases, ownership, audit logs.",
  },
  {
    icon: Users,
    name: "Customer Portal",
    who: "Customer contacts",
    what: "Service surface. Downloads, subscription overview, support, release notes, documentation.",
  },
  {
    icon: HardDrive,
    name: "Self-Hosted",
    who: "End users on-prem",
    what: "The product itself. AI Chat, Knowledge, FAQ, Academy, AI Audit, Users, Organization.",
  },
];

const JOURNEY = [
  { icon: ShoppingCart, title: "Purchase", body: "Order the Basic platform and any premium modules through your OPSQAI account manager." },
  { icon: Download, title: "Receive Package", body: "Download a signed Windows installation package from the Customer Portal." },
  { icon: Play, title: "Run Installer", body: "The wizard provisions PostgreSQL, storage, services, and Caddy on your Windows Server." },
  { icon: Key, title: "Activate License", body: "Paste the signed license bundle issued by OPSQAI. Modules unlock as licensed." },
  { icon: Cog, title: "Configure AI", body: "Choose an AI provider — OpenAI, Azure OpenAI, Ollama, or another OpenAI-compatible endpoint." },
  { icon: HardDrive, title: "Start Using OPSQAI", body: "Invite users, ingest SOPs, and answer operational questions with grounded citations." },
];

function ProductPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Product</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          One platform. Three surfaces.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          OPSQAI ships as a self-hosted Windows product with two cloud-hosted service surfaces
          around it. You own your data and your install. OPSQAI operates the licensing, releases,
          and support that keep it healthy.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {SURFACES.map((s) => (
            <Card key={s.name} className="p-6 border-border/60">
              <s.icon className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold">{s.name}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.who}</div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.what}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-surface-1 border-y border-border/60">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Purchase journey</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            From order to production. No SaaS subscription, no per-seat cloud lock-in — a one-time
            Basic platform, premium modules purchased separately, and annual maintenance.
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
          Talk to us about a reference install for your operations team.
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
