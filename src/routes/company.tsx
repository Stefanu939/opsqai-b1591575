import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { pageHead } from "@/lib/seo";
import {
  Target,
  Eye,
  Compass,
  Users,
  MapPin,
  TrendingUp,
  Globe2,
  Factory,
  Truck,
} from "lucide-react";
import { OixLayout } from "@/components/oix/oix-layout";
import { EnterpriseIntelligence } from "@/components/oix/enterprise-intelligence";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { MottoBand } from "@/components/oix/motto-band";
import { useCompanyCopy } from "@/i18n/pages/company";

export const Route = createFileRoute("/company")({
  head: () =>
    pageHead({
      title: "Company — OPSQAI · Enterprise Operational AI Platform",
      description:
        "OPSQAI is building the operational AI layer for industrial companies. Windows self-hosted, sovereign by design. Mission, team and go-to-market.",
      path: "/company",
      keywords:
        "OPSQAI company, mission, team, go-to-market, DACH industry, operational AI, sovereign AI",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Company", path: "/company" },
      ],
    }),
  component: CompanyPage,
});

const PRINCIPLE_ICONS = [Target, Eye, Compass];
const PHASE_ICONS = [Truck, Factory, Globe2];

function CompanyPage() {
  const copy = useCompanyCopy();

  return (
    <OixLayout>
      {/* Hero — particle genesis */}
      <section className="relative isolate min-h-[90vh] overflow-hidden border-b border-[var(--oix-gold-line)]/40">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-32 md:grid-cols-2 md:px-10 md:pb-32 md:pt-40">
          <div className="max-w-3xl">
            <EditorialHeadline
              as="h1"
              size="xl"
              eyebrow={copy.hero.eyebrow}
              serifAccent={copy.hero.serifAccent}
            >
              {copy.hero.headline}
            </EditorialHeadline>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
              {copy.hero.body}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <OixButton to="/contact?subject=partnership" variant="gold" withArrow>
                {copy.hero.ctaPrimary}
              </OixButton>
              <OixButton to="/self-hosted" variant="ghost">
                {copy.hero.ctaSecondary}
              </OixButton>
            </div>
          </div>
          <EnterpriseIntelligence variant="company" className="hidden md:flex" />
        </div>
      </section>

      {/* Mission / Vision / Why */}
      <SectionShell>
        <EditorialHeadline eyebrow={copy.principles.eyebrow} serifAccent={copy.principles.serifAccent}>
          {copy.principles.headline}
        </EditorialHeadline>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {copy.principles.items.map((p, i) => {
            const Icon = PRINCIPLE_ICONS[i];
            return (
              <Card
                key={p.title}
                className="p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/50 backdrop-blur"
              >
                <Icon className="h-6 w-6 text-[var(--oix-gold)]" />
                <div className="mt-6 oix-display text-xl text-[var(--oix-cream)]">{p.title}</div>
                <p className="mt-3 text-sm text-[var(--oix-cream)]/70 leading-relaxed">{p.body}</p>
              </Card>
            );
          })}
        </div>
      </SectionShell>

      <MottoBand size="lg" compact />

      {/* Team */}
      <SectionShell className="oix-hairline-top oix-hairline-bottom">
        <EditorialHeadline eyebrow={copy.team.eyebrow} serifAccent={copy.team.serifAccent}>
          {copy.team.headline}
        </EditorialHeadline>
        <p className="mt-6 max-w-2xl text-[15px] text-[var(--oix-cream)]/70 leading-relaxed">
          {copy.team.intro}
        </p>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {copy.team.members.map((p) => (
            <Card
              key={p.role}
              className="p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/50 backdrop-blur"
            >
              <Users className="h-5 w-5 text-[var(--oix-gold)]" />
              <div className="mt-6 oix-display text-lg text-[var(--oix-cream)]">{p.name}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--oix-gold-soft)]">
                {p.role}
              </div>
              <p className="mt-4 text-sm text-[var(--oix-cream)]/70 leading-relaxed">{p.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      {/* Go-to-market */}
      <SectionShell>
        <EditorialHeadline eyebrow={copy.gtm.eyebrow} serifAccent={copy.gtm.serifAccent}>
          {copy.gtm.headline}
        </EditorialHeadline>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {copy.gtm.phases.map((p, i) => {
            const Icon = PHASE_ICONS[i];
            return (
              <Card
                key={p.title}
                className="p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/50 backdrop-blur"
              >
                <Icon className="h-6 w-6 text-[var(--oix-gold)]" />
                <div className="mt-6 text-[10px] uppercase tracking-[0.24em] text-[var(--oix-gold-soft)] font-mono">
                  {p.tag}
                </div>
                <div className="mt-2 oix-display text-xl text-[var(--oix-cream)]">{p.title}</div>
                <p className="mt-3 text-sm text-[var(--oix-cream)]/70 leading-relaxed">{p.body}</p>
              </Card>
            );
          })}
        </div>
      </SectionShell>

      {/* Market */}
      <SectionShell className="oix-hairline-top oix-hairline-bottom">
        <EditorialHeadline eyebrow={copy.market.eyebrow} serifAccent={copy.market.serifAccent}>
          {copy.market.headline}
        </EditorialHeadline>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {copy.market.items.map((m) => (
            <Card
              key={m.tag}
              className="p-8 border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/50 backdrop-blur"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[var(--oix-gold)]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--oix-gold-soft)]">
                  {m.tag}
                </span>
              </div>
              <div className="mt-4 oix-display text-4xl text-[var(--oix-cream)]">{m.value}</div>
              <p className="mt-3 text-sm text-[var(--oix-cream)]/70 leading-relaxed">{m.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      {/* CTA */}
      <SectionShell>
        <div className="text-center max-w-3xl mx-auto">
          <MapPin className="h-6 w-6 text-[var(--oix-gold)] mx-auto" />
          <div className="mt-6">
            <EditorialHeadline
              align="center"
              eyebrow={copy.cta.eyebrow}
              serifAccent={copy.cta.serifAccent}
            >
              {copy.cta.headline}
            </EditorialHeadline>
          </div>
          <p className="mt-6 text-[var(--oix-cream)]/70">
            {copy.cta.body}
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <OixButton to="/contact" variant="gold" withArrow>
              {copy.cta.ctaPrimary}
            </OixButton>
            <OixButton to="/self-hosted" variant="ghost">
              {copy.cta.ctaSecondary}
            </OixButton>
          </div>
        </div>
      </SectionShell>
    </OixLayout>
  );
}
