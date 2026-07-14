import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead, faqLd } from "@/lib/seo";
import { Package, Puzzle, LifeBuoy, Check } from "lucide-react";

const PRICING_FAQS = [
  {
    question: "Is OPSQAI a SaaS product?",
    answer:
      "No. OPSQAI is a self-hosted product. You buy the Basic platform once, add premium modules as needed, and keep it running under an annual maintenance contract. There is no monthly per-seat cloud subscription.",
  },
  {
    question: "What does Basic include?",
    answer:
      "The Basic platform includes AI Chat, Knowledge Base, FAQ Library, notifications, bilingual UI (EN/DE), and PWA support. It runs on your Windows Server with your chosen AI provider.",
  },
  {
    question: "How are premium modules priced?",
    answer:
      "Each premium module is a one-time purchase. Prices depend on the module and are quoted per install. Activation is issued by OPSQAI as a signed module license.",
  },
  {
    question: "What is Annual Maintenance?",
    answer:
      "Annual Maintenance covers signed updates, security releases, support tickets, and ownership continuity. Without an active maintenance contract, the install continues to work but stops receiving updates and support.",
  },
];

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "Pricing — OPSQAI",
      description:
        "OPSQAI pricing model: one-time Basic platform, premium modules purchased separately, and annual maintenance. No SaaS, no per-seat cloud lock-in.",
      path: "/pricing",
      keywords: "OPSQAI pricing, one-time license, annual maintenance, premium modules, self-hosted AI pricing",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Pricing", path: "/pricing" },
      ],
      jsonLd: [faqLd(PRICING_FAQS)],
    }),
  component: PricingPage,
});

const TIERS = [
  {
    icon: Package,
    name: "Basic Platform",
    tag: "One-time",
    price: "From €18,000",
    body: "Perpetual license for the Basic bundle: AI Chat, Knowledge Base, FAQ, notifications, bilingual UI, PWA. Installer, signed license, and initial setup included.",
    bullets: [
      "Perpetual, per-install license",
      "Windows Server deployment",
      "Bring-your-own AI provider",
      "EU-compliant by design",
    ],
    cta: "Request a quote",
    to: "/contact",
  },
  {
    icon: Puzzle,
    name: "Premium Modules",
    tag: "One-time, per module",
    price: "Priced per module",
    body: "Activate additional capabilities like Academy, Analytics, AI Workspace Audit, Executive Dashboard, Compliance Center, Enterprise Export, and more. Each purchased separately.",
    bullets: [
      "Signed module licenses",
      "Activated by OPSQAI",
      "No cross-module dependencies",
      "Requested from inside the app",
    ],
    cta: "Browse modules",
    to: "/modules",
  },
  {
    icon: LifeBuoy,
    name: "Annual Maintenance",
    tag: "Yearly",
    price: "20% of license value",
    body: "Signed updates and security releases, priority support with defined response targets, module compatibility guarantees, and ownership continuity.",
    bullets: [
      "Signed releases & updates",
      "Support with SLA",
      "Compatibility guaranteed",
      "Renewals handled by OPSQAI",
    ],
    cta: "Talk to sales",
    to: "/contact",
  },
];

function PricingPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Pricing</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          Own the platform. Pay for what you use.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          OPSQAI is not a SaaS. You purchase the Basic platform once, activate premium modules as
          you need them, and keep the install healthy with Annual Maintenance.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => (
            <Card key={t.name} className="p-6 border-border/60 flex flex-col">
              <t.icon className="h-6 w-6 text-primary" />
              <div className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{t.tag}</div>
              <div className="mt-1 font-semibold text-lg">{t.name}</div>
              <div className="mt-3 text-2xl font-semibold tracking-tight">{t.price}</div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{t.body}</p>
              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground flex-1">
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-5 w-full">
                <Link to={t.to}>{t.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground text-center">
          Indicative pricing. Every deployment is quoted based on scope, modules, and support tier.
        </p>
      </section>

      <section className="bg-surface-1 border-y border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Frequently asked</h2>
          <div className="mt-6 space-y-4">
            {PRICING_FAQS.map((f) => (
              <div key={f.question} className="border-b border-border/60 pb-4">
                <div className="font-semibold text-sm">{f.question}</div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Get a quote for your operation.</h2>
        <p className="mt-3 text-muted-foreground">
          Send us your rough scope and we'll come back with a fixed price.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/contact">Request a quote</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
