import { createFileRoute } from "@tanstack/react-router";
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
import { OixLayout } from "@/components/oix/oix-layout";
import { EnterpriseIntelligence } from "@/components/oix/enterprise-intelligence";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { MottoBand } from "@/components/oix/motto-band";
import { useMarketing } from "@/i18n/marketing";

export const Route = createFileRoute("/product")({
  head: () =>
    pageHead({
      title: "Product — OPSQAI Operational AI Platform for Windows Self-Hosted",
      description:
        "OPSQAI is a licensed operational AI platform for Windows Self-Hosted environments. Management Center and Customer Portal are support services, not customer products.",
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
            "OPSQAI is an Operational AI Platform delivered as a Windows Self-Hosted product. Cloud surfaces exist only to support the installation.",
        }),
      ],
    }),
  component: ProductPage,
});

const SURFACE_ICONS = [Building2, Users, HardDrive];
const JOURNEY_ICONS = [ShoppingCart, Download, Play, Key, Cog, HardDrive];

function ProductPage() {
  const m = useMarketing();

  return (
    <OixLayout>
      {/* Cinematic hero */}
      <section className="relative isolate min-h-[88vh] overflow-hidden border-b border-[var(--oix-gold-line)]/40">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-32 md:grid-cols-2 md:px-10 md:pb-32 md:pt-40">
          <div>
            <EditorialHeadline as="h1" size="xl" eyebrow={m.product.eyebrow} serifAccent={m.product.serif}>
              {m.product.title}
            </EditorialHeadline>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
              {m.product.intro}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <OixButton to="/pilot" variant="gold" withArrow>
                {m.cta.startPilot}
              </OixButton>
              <OixButton to="/contact" variant="ghost">
                {m.cta.contactSales}
              </OixButton>
              <OixButton to="/self-hosted" variant="ghost">
                {m.cta.selfHostedDetails}
              </OixButton>
            </div>
          </div>
          <EnterpriseIntelligence variant="product" className="hidden md:block" />
        </div>
      </section>

      {/* The boundary */}
      <SectionShell className="oix-hairline-bottom">
        <div className="max-w-3xl">
          <div className="oix-eyebrow mb-6">{m.product.guaranteeEyebrow}</div>
          <p className="oix-display text-[clamp(1.6rem,3.2vw,2.75rem)] leading-[1.15] text-[var(--oix-cream)]">
            {m.product.guaranteeStrong}
          </p>
          <p className="mt-6 text-lg leading-relaxed text-[var(--oix-cream-dim)]">
            {m.product.guarantee}
          </p>
        </div>
      </SectionShell>

      {/* Product and supporting services */}
      <SectionShell>
        <div className="oix-eyebrow mb-10">{m.product.surfacesEyebrow}</div>
        <div className="grid gap-px bg-[var(--oix-gold-line)] md:grid-cols-3">
          {m.product.surfaces.map((s, i) => {
            const Icon = SURFACE_ICONS[i] ?? HardDrive;
            return (
              <div
                key={s.name}
                className="flex flex-col bg-[var(--oix-bg-deep)] p-8"
              >
                <Icon className="h-6 w-6 text-[var(--oix-gold)]" strokeWidth={1.4} />
                <div className="mt-6 text-[10px] uppercase tracking-[0.28em] text-[var(--oix-gold-soft)]">
                  {s.tag}
                </div>
                <div className="oix-display mt-2 text-xl">{s.name}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--oix-cream-dim)]">
                  {s.who}
                </div>
                <p className="mt-5 text-sm leading-relaxed text-[var(--oix-cream-dim)]">{s.what}</p>
              </div>
            );
          })}
        </div>
      </SectionShell>

      <MottoBand />

      {/* Journey */}
      <SectionShell className="oix-hairline-top">
        <div className="max-w-2xl">
          <div className="oix-eyebrow mb-6">{m.product.journeyEyebrow}</div>
          <h2 className="oix-display text-[clamp(1.75rem,3.4vw,3rem)] leading-[1.1]">
            {m.product.journeyTitle}
          </h2>
          <p className="mt-5 text-[var(--oix-cream-dim)]">{m.product.journeyIntro}</p>
        </div>

        <ol className="mt-14 grid gap-px bg-[var(--oix-gold-line)] md:grid-cols-3">
          {m.product.journey.map((j, i) => {
            const Icon = JOURNEY_ICONS[i] ?? Cog;
            return (
              <li key={j.title} className="bg-[var(--oix-bg-deep)] p-7">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[var(--oix-gold)]">
                  <Icon className="h-4 w-4" strokeWidth={1.4} />
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="oix-display mt-3 text-base">{j.title}</div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--oix-cream-dim)]">{j.body}</p>
              </li>
            );
          })}
        </ol>
      </SectionShell>

      {/* Final CTA */}
      <SectionShell className="oix-hairline-top text-center">
        <h2 className="oix-display mx-auto max-w-2xl text-[clamp(1.75rem,3.4vw,3rem)] leading-[1.1]">
          {m.product.ctaTitle}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[var(--oix-cream-dim)]">{m.product.ctaBody}</p>
        <div className="mt-9 flex justify-center gap-3">
          <OixButton to="/pilot" variant="gold" withArrow>
            {m.cta.startPilot}
          </OixButton>
          <OixButton to="/contact" variant="ghost">
            {m.cta.proposal}
          </OixButton>
          <OixButton to="/pricing" variant="ghost">
            {m.nav.pricing}
          </OixButton>
        </div>
      </SectionShell>
    </OixLayout>
  );
}
