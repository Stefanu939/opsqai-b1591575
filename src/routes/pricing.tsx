import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — OPSQAI" },
      { name: "description", content: "OPSQAI pricing for logistics teams. Starter, Business and Enterprise plans. Talk to sales for a tailored quote." },
      { property: "og:title", content: "Pricing — OPSQAI" },
      { property: "og:url", content: "https://opsqai.de/pricing" },
      { property: "og:description", content: "OPSQAI pricing for logistics teams. Starter, Business and Enterprise plans. Talk to sales for a tailored quote." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/pricing" }],
  }),
  component: PricingPage,
});

const PLANS = [
  {
    name: "Starter",
    price: "Contact",
    blurb: "For a single warehouse getting started with operational knowledge.",
    items: ["Up to 25 users", "Up to 200 documents", "EN / DE / RO", "Email support", "EU hosting"],
    cta: "Talk to sales",
    highlight: false,
  },
  {
    name: "Business",
    price: "Contact",
    blurb: "For multi-site operators with departments, shifts and managers.",
    items: ["Up to 250 users", "Unlimited documents", "Audit log + analytics", "Manager & admin roles", "Priority support"],
    cta: "Talk to sales",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    blurb: "For groups operating across companies, countries and tenants.",
    items: ["Unlimited users", "Platform super admin", "SSO / SAML on request", "DPA & subprocessors review", "Dedicated success manager"],
    cta: "Talk to sales",
    highlight: false,
  },
];

function PricingPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 md:py-24 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Pricing</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">Built for operations. Priced per company.</h1>
        <p className="mt-5 text-lg text-muted-foreground">Talk to us about your sites, languages and document volume — we'll put together a fit-for-purpose quote.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <Card
              key={p.name}
              className={`p-6 flex flex-col ${p.highlight ? "border-primary shadow-lg" : "border-border/60"}`}
            >
              {p.highlight && <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">Most popular</div>}
              <div className="font-semibold text-lg">{p.name}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">{p.price}</div>
              <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
              <ul className="mt-5 space-y-2 flex-1">
                {p.items.map((i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={p.highlight ? "default" : "outline"}>
                <Link to="/contact">{p.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 text-center text-sm text-muted-foreground">
        <p>All plans include EU hosting, multi-tenant isolation, audit log, role-based access and OPSQAI's source-grounded answering. Setup and onboarding are included.</p>
      </section>
    </MarketingLayout>
  );
}
