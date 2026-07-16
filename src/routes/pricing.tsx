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
      "No. OPSQAI is a Windows Self-Hosted product. You buy the Basic Platform once, add premium modules as needed, and keep it running under an annual maintenance contract. There is no monthly per-seat cloud subscription.",
  },
  {
    question: "What does the Basic Platform include?",
    answer:
      "AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Users, Organization and Subscription. It runs on the customer's Windows Server with the customer's chosen AI provider.",
  },
  {
    question: "How are premium modules priced?",
    answer:
      "Each premium module is licensed separately. Pricing depends on the module, scope and installation size. Activation is issued by OPSQAI as a signed module license — no reinstall required.",
  },
  {
    question: "What is Annual Maintenance?",
    answer:
      "Annual Maintenance covers signed updates, security releases, support with defined response targets, module compatibility guarantees and ownership continuity. Without an active maintenance contract, the install continues to work but stops receiving updates and support.",
  },
];

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "Pricing — OPSQAI Enterprise Operational AI Platform",
      description:
        "OPSQAI pricing model: one-time Basic Platform, premium modules purchased separately, and annual maintenance. Windows Self-Hosted — no SaaS, no per-seat cloud lock-in.",
      path: "/pricing",
      keywords:
        "OPSQAI pricing, one-time license, annual maintenance, premium modules, self-hosted AI pricing",
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
    tag: "One-time purchase",
    body: "Perpetual license for the Basic Platform: AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Users, Organization and Subscription. Windows installer, signed license and initial setup included.",
    bullets: [
      "Perpetual, per-installation license",
      "Windows Self-Hosted",
      "Customer-owned AI provider",
      "Signed installer and license",
    ],
    cta: "Request pricing",
    to: "/contact",
  },
  {
    icon: Puzzle,
    name: "Premium Modules",
    tag: "One-time, per module",
    body: "Activate additional capabilities on top of the Basic Platform. Each module is licensed separately and activated by OPSQAI through a signed license — no reinstall required.",
    bullets: [
      "Signed module licenses",
      "Activated by OPSQAI",
      "No cross-module dependencies",
      "No downtime, no data movement",
    ],
    cta: "Browse modules",
    to: "/modules",
  },
  {
    icon: LifeBuoy,
    name: "Annual Maintenance",
    tag: "Recurring",
    body: "Signed updates and security releases, priority support with defined response targets, module compatibility guarantees, and ownership continuity for the installation.",
    bullets: [
      "Signed releases and updates",
      "Support with response targets",
      "Compatibility guaranteed",
      "Managed by OPSQAI",
    ],
    cta: "Talk to sales",
    to: "/contact",
  },
];

function PricingPage() {
  return (
    <MarketingLayout>
      <section className="relative border-b border-border/50 overflow-hidden">
        <div className="absolute inset-0 -z-10 [background:radial-gradient(60%_50%_at_50%_0%,rgba(201,162,76,0.08),transparent_75%)]" />
        <div className="mx-auto max-w-5xl px-4 py-20 md:py-28">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--gold)] font-medium">
            Pricing
          </p>
          <h1 className="mt-3 font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Own the platform.
            <br className="hidden sm:block" />
            <span className="text-[color:var(--gold)]"> Pay for what you use.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-3xl">
            OPSQAI is not a SaaS. You purchase the Basic Platform once, activate
            premium modules as you need them, and keep the installation healthy
            with Annual Maintenance.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((t, i) => {
            const featured = i === 0;
            return (
              <Card
                key={t.name}
                className={`relative p-6 flex flex-col transition-all hover:-translate-y-1 hover:shadow-lg ${
                  featured
                    ? "border-[var(--gold-line)] bg-[var(--gold-soft)]/25"
                    : "border-border/60"
                }`}
              >
                {featured && (
                  <span
                    aria-hidden
                    className="absolute top-0 left-6 right-6 h-[3px] rounded-b bg-[color:var(--gold)]"
                  />
                )}
                <div className="h-10 w-10 rounded-lg bg-[var(--gold-soft)] border border-[var(--gold-line)] flex items-center justify-center">
                  <t.icon className="h-5 w-5 text-[color:var(--gold)]" />
                </div>
                <div className="mt-5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
                  {t.tag}
                </div>
                <div className="mt-1 font-display font-semibold text-xl">{t.name}</div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{t.body}</p>
                <ul className="mt-5 space-y-2 text-sm flex-1">
                  {t.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-[color:var(--gold)] shrink-0 mt-0.5" />
                      <span className="text-foreground/85">{b}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={featured ? "default" : "outline"}
                  className="mt-6 w-full"
                >
                  <Link to={t.to}>{t.cta}</Link>
                </Button>
              </Card>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-muted-foreground text-center max-w-2xl mx-auto">
          Pricing depends on company size, selected premium modules and the
          maintenance tier. Every deployment is quoted individually.
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
        <h2 className="text-3xl font-semibold tracking-tight">Request pricing.</h2>
        <p className="mt-3 text-muted-foreground">
          Tell us about your operation — company size, target modules and
          maintenance needs. We come back with a fixed quote.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/contact">Request pricing</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
