import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { pageHead, faqLd } from "@/lib/seo";
import { Package, Puzzle, LifeBuoy, Check } from "lucide-react";
import { OixLayout } from "@/components/oix/oix-layout";
import { Scene3D } from "@/components/three/scene-3d";
import { ModuleConstellation } from "@/components/three/primitives/module-constellation";
import { GridFloor } from "@/components/three/primitives/grid-floor";
import { GoldBloom } from "@/components/three/primitives/gold-bloom";
import { EmberFog } from "@/components/three/primitives/ember-fog";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { MottoBand } from "@/components/oix/motto-band";

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
      "Annual Maintenance covers signed updates, security releases, support with defined response targets, module compatibility guarantees and ownership continuity.",
  },
];

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "Pricing — OPSQAI Enterprise Operational AI Platform",
      description:
        "OPSQAI pricing: one-time Basic Platform, premium modules purchased separately, and annual maintenance. Windows Self-Hosted — no SaaS lock-in.",
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
    tag: "One-time · Perpetual",
    body: "AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Users, Organization and Subscription. Windows installer, signed license and initial setup included.",
    bullets: [
      "Perpetual, per-installation license",
      "Windows Self-Hosted",
      "Customer-owned AI provider",
      "Signed installer and license",
    ],
    cta: "Request pricing",
    to: "/contact?subject=pricing",
    featured: true,
  },
  {
    icon: Puzzle,
    name: "Premium Modules",
    tag: "One-time · Per module",
    body: "Activate additional capabilities on top of the Basic Platform. Each module is licensed separately and activated by OPSQAI through a signed license — no reinstall required.",
    bullets: [
      "Signed module licenses",
      "Activated by OPSQAI",
      "No cross-module dependencies",
      "No downtime, no data movement",
    ],
    cta: "Browse modules",
    to: "/modules",
    featured: false,
  },
  {
    icon: LifeBuoy,
    name: "Annual Maintenance",
    tag: "Recurring · Yearly",
    body: "Signed updates and security releases, priority support with defined response targets, module compatibility guarantees, and ownership continuity.",
    bullets: [
      "Signed releases and updates",
      "Support with response targets",
      "Compatibility guaranteed",
      "Managed by OPSQAI",
    ],
    cta: "Talk to sales",
    to: "/contact?subject=sales",
    featured: false,
  },
];

function PricingPage() {
  return (
    <OixLayout>
      {/* Hero */}
      <section className="relative isolate min-h-[85vh] overflow-hidden border-b border-[var(--oix-gold-line)]/40">
        <div className="absolute inset-0 -z-10">
          <Scene3D cameraPosition={[0, 0.8, 5.5]} cameraFov={45}>
            <ambientLight intensity={0.4} />
            <pointLight position={[3, 3, 3]} intensity={1.1} color="#c9a84c" />
            <pointLight position={[-3, -1, 2]} intensity={0.5} color="#0d7a5f" />
            <GridFloor />
            <EmberFog />
            <ModuleConstellation nodeCount={12} />
            <GoldBloom />
          </Scene3D>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 60% at 50% 40%, rgba(4,10,8,0) 0%, rgba(4,10,8,0.9) 85%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 md:px-10 pt-32 pb-24 md:pt-40 md:pb-32">
          <div className="max-w-3xl">
            <EditorialHeadline
              as="h1"
              size="xl"
              eyebrow="Pricing · No SaaS"
              serifAccent="pay for what you use."
            >
              Own the platform.
            </EditorialHeadline>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
              OPSQAI is not a SaaS. You purchase the Basic Platform once, activate
              premium modules as you need them, and keep the installation healthy
              with Annual Maintenance.
            </p>
          </div>
        </div>
      </section>

      {/* Tiers */}
      <SectionShell>
        <EditorialHeadline eyebrow="Three components" serifAccent="one purchase.">
          A model that
        </EditorialHeadline>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => (
            <Card
              key={t.name}
              className={`relative p-8 flex flex-col border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 backdrop-blur transition-all hover:-translate-y-1 ${
                t.featured ? "border-[var(--oix-gold)]/70" : ""
              }`}
            >
              {t.featured && (
                <span
                  aria-hidden
                  className="absolute top-0 left-8 right-8 h-[2px] bg-[var(--oix-gold)]"
                  style={{ boxShadow: "0 0 12px var(--oix-gold)" }}
                />
              )}
              <div className="h-12 w-12 rounded-none border border-[var(--oix-gold-line)]/60 bg-[var(--oix-emerald)]/10 flex items-center justify-center">
                <t.icon className="h-5 w-5 text-[var(--oix-gold)]" />
              </div>
              <div className="mt-6 text-[10px] uppercase tracking-[0.22em] text-[var(--oix-gold-soft)] font-medium">
                {t.tag}
              </div>
              <div className="mt-2 oix-display text-2xl text-[var(--oix-cream)]">{t.name}</div>
              <p className="mt-4 text-sm text-[var(--oix-cream)]/70 leading-relaxed">{t.body}</p>
              <ul className="mt-6 space-y-2.5 text-sm flex-1">
                {t.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-[var(--oix-gold)] shrink-0 mt-0.5" />
                    <span className="text-[var(--oix-cream)]/85">{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <OixButton
                  to={t.to}
                  variant={t.featured ? "gold" : "ghost"}
                  withArrow
                  className="w-full"
                >
                  {t.cta}
                </OixButton>
              </div>
            </Card>
          ))}
        </div>
        <p className="mt-10 text-xs uppercase tracking-[0.22em] text-[var(--oix-cream)]/50 text-center max-w-2xl mx-auto">
          Pricing depends on company size, selected premium modules and the
          maintenance tier · every deployment quoted individually
        </p>
      </SectionShell>

      <MottoBand size="lg" compact />

      {/* FAQ */}
      <SectionShell className="oix-hairline-top oix-hairline-bottom">
        <EditorialHeadline eyebrow="Frequently asked" serifAccent="honestly.">
          Answered
        </EditorialHeadline>
        <div className="mt-14 divide-y divide-[var(--oix-gold-line)]/30 border-y border-[var(--oix-gold-line)]/30">
          {PRICING_FAQS.map((f) => (
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
            eyebrow="Fixed quote · one page"
            serifAccent="pricing."
          >
            Request your
          </EditorialHeadline>
          <p className="mt-6 text-[var(--oix-cream)]/70">
            Tell us about your operation — company size, target modules and
            maintenance needs. We come back with a fixed quote.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <OixButton to="/contact?subject=pricing" variant="gold" withArrow>
              Request pricing
            </OixButton>
            <OixButton to="/modules" variant="ghost">
              Browse modules
            </OixButton>
          </div>
        </div>
      </SectionShell>
    </OixLayout>
  );
}
