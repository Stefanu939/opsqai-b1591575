import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Factory, ShoppingCart, Package, Pill, Plane } from "lucide-react";

export const Route = createFileRoute("/industries")({
  head: () => ({
    meta: [
      { title: "Industries — OPSQAI" },
      { name: "description", content: "OPSQAI for 3PL, e-commerce fulfilment, manufacturing logistics, pharma cold chain, retail DCs and air-cargo handlers." },
      { property: "og:title", content: "Industries — OPSQAI" },
      { property: "og:description", content: "Where OPSQAI fits in the supply chain." },
      { property: "og:url", content: "https://opsqai.de/industries" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/industries" }],
  }),
  component: IndustriesPage,
});

const INDUSTRIES = [
  {
    icon: Truck,
    title: "3PL & contract logistics",
    body: "Multi-client warehouses with different SOPs per customer. OPSQAI scopes each customer's procedures separately and gives operators answers in their own language.",
    examples: ["Customer-specific receiving rules", "Per-account KPI escalation", "Multilingual operator base"],
  },
  {
    icon: ShoppingCart,
    title: "E-commerce fulfilment",
    body: "Pick, pack and returns operations where seasonal staff turn over fast. New hires get the same answer the team lead would give — without interrupting the team lead.",
    examples: ["Returns and damage handling", "Peak-season onboarding", "Carrier-specific labeling"],
  },
  {
    icon: Factory,
    title: "Manufacturing logistics",
    body: "Inbound raw materials, line-side replenishment and outbound finished goods. SOPs interact with quality, EHS and maintenance procedures.",
    examples: ["Material handling SOPs", "EHS / PPE quick reference", "Line-stop escalation paths"],
  },
  {
    icon: Pill,
    title: "Pharma & cold chain",
    body: "GxP-adjacent operations where audit traceability matters. Every answer cites the SOP and version; the audit log is per-tenant and append-only.",
    examples: ["Temperature-excursion handling", "Deviation reporting flow", "Restricted-access stockrooms"],
  },
  {
    icon: Package,
    title: "Retail distribution centers",
    body: "High-throughput cross-dock and store-replenishment operations. OPSQAI surfaces the right SOP fast so the line keeps moving.",
    examples: ["Cross-dock procedures", "Store-replenishment rules", "Returns to vendor"],
  },
  {
    icon: Plane,
    title: "Air cargo & ground handling",
    body: "Ramp, build-up and breakdown operations with strict dangerous-goods and security procedures. OPSQAI keeps the playbook one tap away.",
    examples: ["DG acceptance checks", "ULD build-up rules", "Security & known-shipper checks"],
  },
];

function IndustriesPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Industries</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">One assistant. Many corners of the supply chain.</h1>
        <p className="mt-5 text-lg text-muted-foreground">
          OPSQAI was designed inside a working warehouse. It generalizes to the operations below because the underlying problem is the same: a procedure exists, the operator needs it now, in their language.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((s) => (
            <Card key={s.title} className="p-6 border-border/60">
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                {s.examples.map((b) => <li key={b}>· {b}</li>)}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-20 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Don't see yours?</h2>
        <p className="mt-2 text-muted-foreground">If your team runs on SOPs and FAQs, OPSQAI fits. Tell us about your operation.</p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Button asChild><Link to="/contact">Talk to us</Link></Button>
          <Button asChild variant="outline"><Link to="/solutions">See solutions</Link></Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
