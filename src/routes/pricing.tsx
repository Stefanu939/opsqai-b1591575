import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { pageHead, faqLd } from "@/lib/seo";
import { Package, Puzzle, Layers, LifeBuoy, Check } from "lucide-react";
import { OixLayout } from "@/components/oix/oix-layout";
import { EnterpriseIntelligence } from "@/components/oix/enterprise-intelligence";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { MottoBand } from "@/components/oix/motto-band";
import { usePricingCopy } from "@/i18n/pages/pricing";

// English source used only for SEO head (faqLd) — not user-visible copy.
const PRICING_FAQS_SEO = [
  {
    question: "Is OPSQAI a SaaS product?",
    answer:
      "No. OPSQAI is a Windows Self-Hosted platform. You license the Core platform once for your installation, enable the OPSQAI products your business needs, and keep it running under an annual maintenance contract. There is no monthly per-seat cloud subscription.",
  },
  {
    question: "What does the OPSQAI Core platform include?",
    answer:
      "Every platform capability: AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Knowledge Gaps, SOP versioning, Internal Requests, Internal Chat, Reports, Support Center, Compliance Center, Enterprise Export, Workspace Health, RBAC, multi-language and notifications. These are never sold individually.",
  },
  {
    question: "What is an OPSQAI product?",
    answer:
      "A domain solution such as OPSQAI Logistics. Your company profile determines which products are relevant; OPSQAI enables the ones you license and delivers them as signed entitlements.",
  },
  {
    question: "What is Annual Maintenance?",
    answer:
      "Annual Maintenance covers signed updates, security releases, support with defined response targets, compatibility guarantees and ownership continuity.",
  },
];

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "Pricing — OPSQAI Enterprise Operational AI Platform",
      description:
        "OPSQAI pricing: one-time Core platform license, OPSQAI products per business domain, optional add-ons and annual maintenance. Windows Self-Hosted — no SaaS lock-in.",
      path: "/pricing",
      keywords:
        "OPSQAI pricing, one-time license, annual maintenance, OPSQAI products, self-hosted AI pricing",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Pricing", path: "/pricing" },
      ],
      jsonLd: [faqLd(PRICING_FAQS_SEO)],
    }),
  component: PricingPage,
});

const TIER_META = [
  { icon: Package, to: "/contact?subject=pricing", featured: true },
  { icon: Puzzle, to: "/modules", featured: false },
  { icon: Layers, to: "/contact?subject=sales", featured: false },
  { icon: LifeBuoy, to: "/contact?subject=sales", featured: false },
];

function PricingPage() {
  const t = usePricingCopy();
  const tiers = t.tiers.items.map((tier, i) => ({ ...tier, ...TIER_META[i] }));

  return (
    <OixLayout>
      {/* Hero */}
      <section className="relative isolate min-h-[85vh] overflow-hidden border-b border-[var(--oix-gold-line)]/40">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-32 md:grid-cols-[minmax(0,1fr)_minmax(24rem,0.8fr)] md:px-10 md:pb-32 md:pt-40">
          <div className="max-w-3xl">
            <EditorialHeadline
              as="h1"
              size="xl"
              eyebrow={t.hero.eyebrow}
              serifAccent={t.hero.serifAccent}
            >
              {t.hero.headline}
            </EditorialHeadline>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
              {t.hero.body}
            </p>
          </div>
          <EnterpriseIntelligence variant="platform" compact className="hidden md:flex" />
        </div>
      </section>

      {/* Tiers */}
      <SectionShell>
        <EditorialHeadline eyebrow={t.tiers.eyebrow} serifAccent={t.tiers.serifAccent}>
          {t.tiers.headline}
        </EditorialHeadline>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <Link key={tier.name} to={tier.to} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--oix-gold)]">
            <Card className={`relative h-full p-8 flex flex-col border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 backdrop-blur ${tier.featured ? "border-[var(--oix-gold)]/70" : ""}`}>
              {tier.featured && (
                <span
                  aria-hidden
                  className="absolute top-0 left-8 right-8 h-[2px] bg-[var(--oix-gold)]"
                  style={{ boxShadow: "0 0 12px var(--oix-gold)" }}
                />
              )}
              <div className="h-12 w-12 rounded-none border border-[var(--oix-gold-line)]/60 bg-[var(--oix-emerald)]/10 flex items-center justify-center">
                <tier.icon className="h-5 w-5 text-[var(--oix-gold)]" />
              </div>
              <div className="mt-6 text-[10px] uppercase tracking-[0.22em] text-[var(--oix-gold-soft)] font-medium">
                {tier.tag}
              </div>
              <div className="mt-2 oix-display text-2xl text-[var(--oix-cream)]">{tier.name}</div>
              <p className="mt-4 text-sm text-[var(--oix-cream)]/70 leading-relaxed">{tier.body}</p>
              <ul className="mt-6 space-y-2.5 text-sm flex-1">
                {tier.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-[var(--oix-gold)] shrink-0 mt-0.5" />
                    <span className="text-[var(--oix-cream)]/85">{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 border-t border-[var(--oix-gold-line)] pt-5 text-xs font-medium uppercase tracking-[0.18em] text-[var(--oix-gold-soft)]">
                {tier.cta} <span aria-hidden>↗</span>
              </div>
            </Card>
            </Link>
          ))}
        </div>
        <p className="mt-10 text-xs uppercase tracking-[0.22em] text-[var(--oix-cream)]/50 text-center max-w-2xl mx-auto">
          {t.tiers.footnote}
        </p>
      </SectionShell>

      <MottoBand size="lg" compact />

      {/* FAQ */}
      <SectionShell className="oix-hairline-top oix-hairline-bottom">
        <EditorialHeadline eyebrow={t.faq.eyebrow} serifAccent={t.faq.serifAccent}>
          {t.faq.headline}
        </EditorialHeadline>
        <div className="mt-14 divide-y divide-[var(--oix-gold-line)]/30 border-y border-[var(--oix-gold-line)]/30">
          {t.faq.items.map((f) => (
            <div key={f.question} className="py-6 grid md:grid-cols-[1fr_2fr] gap-6">
              <div className="font-semibold text-[var(--oix-cream)] text-[15px]">{f.question}</div>
              <p className="text-sm text-[var(--oix-cream)]/70 leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      {/* CTA */}
      <SectionShell>
        <div className="text-center max-w-3xl mx-auto">
          <EditorialHeadline
            align="center"
            eyebrow={t.finalCta.eyebrow}
            serifAccent={t.finalCta.serifAccent}
          >
            {t.finalCta.headline}
          </EditorialHeadline>
          <p className="mt-6 text-[var(--oix-cream)]/70">
            {t.finalCta.body}
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <OixButton to="/contact?subject=pricing" variant="gold" withArrow>
              {t.finalCta.ctaPrimary}
            </OixButton>
            <OixButton to="/modules" variant="ghost">
              {t.finalCta.ctaSecondary}
            </OixButton>
          </div>
        </div>
      </SectionShell>
    </OixLayout>
  );
}
