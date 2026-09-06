import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { pageHead, breadcrumbLd } from "@/lib/seo";
import { OixLayout } from "@/components/oix/oix-layout";
import { EnterpriseIntelligence } from "@/components/oix/enterprise-intelligence";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { MottoBand } from "@/components/oix/motto-band";
import { Card } from "@/components/ui/card";
import {
  SOLUTION_VERTICALS,
  isSolutionVertical,
  solutionsCopyEn,
  useSolutionsCopy,
  type SolutionVertical,
} from "@/i18n/pages/solutions";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/solutions/$vertical")({
  loader: ({ params }) => {
    if (!isSolutionVertical(params.vertical)) throw notFound();
    return { vertical: params.vertical as SolutionVertical };
  },
  head: ({ params }) => {
    const slug: SolutionVertical = isSolutionVertical(params.vertical)
      ? params.vertical
      : "logistics";
    const v = solutionsCopyEn.verticals[slug];
    return pageHead({
      title: v.meta.title,
      description: v.meta.description,
      path: `/solutions/${slug}`,
      keywords: `${v.name}, self-hosted AI, operational knowledge, SOP answers, Romania, Germany, DACH`,
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Solutions", path: "/solutions" },
        { name: v.name, path: `/solutions/${slug}` },
      ],
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Solutions", path: "/solutions" },
          { name: v.name, path: `/solutions/${slug}` },
        ]),
      ],
    });
  },
  component: VerticalPage,
});

function VerticalPage() {
  const { vertical } = Route.useLoaderData();
  const t = useSolutionsCopy();
  const v = t.verticals[vertical];
  const others = SOLUTION_VERTICALS.filter((s) => s !== vertical);

  return (
    <OixLayout>
      <section className="relative isolate overflow-hidden border-b border-[var(--oix-gold-line)]/40">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-32 md:grid-cols-2 md:px-10 md:pb-24 md:pt-40">
          <div>
            <EditorialHeadline
              as="h1"
              size="xl"
              eyebrow={v.hero.eyebrow}
              serifAccent={v.hero.serifAccent}
            >
              {v.hero.headline}
            </EditorialHeadline>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
              {v.hero.body}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <OixButton to="/pilot" variant="gold" withArrow>
                {t.labels.startPilot}
              </OixButton>
              <OixButton to="/contact?subject=demo" variant="ghost">
                {t.labels.bookDemo}
              </OixButton>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {v.outcomes.map((o) => (
                <div key={o.label}>
                  <div className="oix-display text-xl text-[var(--oix-gold)]">{o.value}</div>
                  <div className="mt-1 text-xs leading-relaxed text-[var(--oix-cream)]/60">
                    {o.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <EnterpriseIntelligence variant="contact" compact className="hidden md:block" />
        </div>
      </section>

      <SectionShell>
        <div className="oix-eyebrow mb-6">{t.labels.painsEyebrow}</div>
        <h2 className="oix-display text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] text-[var(--oix-cream)]">
          {t.labels.painsTitle}
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {v.pains.map((p) => (
            <div
              key={p.title}
              className="flex items-start gap-4 rounded-sm border border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/40 p-6"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--oix-gold)]" />
              <div>
                <div className="text-sm font-semibold text-[var(--oix-cream)]">{p.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--oix-cream)]/70">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <MottoBand />

      <SectionShell>
        <div className="oix-eyebrow mb-6">{t.labels.capabilitiesEyebrow}</div>
        <h2 className="oix-display text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] text-[var(--oix-cream)]">
          {t.labels.capabilitiesTitle}
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {v.capabilities.map((cap) => (
            <Card
              key={cap.title}
              className="border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/50 p-7"
            >
              <div className="flex items-start gap-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--oix-gold)]" />
                <div>
                  <div className="text-sm font-semibold text-[var(--oix-cream)]">{cap.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--oix-cream)]/70">
                    {cap.body}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <Card className="border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/60 p-10 oix-brackets">
          <h2 className="oix-display text-2xl text-[var(--oix-cream)]">{v.cta.title}</h2>
          <p className="mt-4 max-w-2xl text-[var(--oix-cream)]/70">{v.cta.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <OixButton to="/pilot" variant="gold" withArrow>
              {t.labels.startPilot}
            </OixButton>
            <OixButton to="/resources" variant="ghost">
              {t.labels.getResources}
            </OixButton>
          </div>
        </Card>

        <div className="mt-14">
          <div className="oix-eyebrow mb-6">{t.labels.otherVerticals}</div>
          <div className="grid gap-4 sm:grid-cols-3">
            {others.map((slug) => (
              <Link
                key={slug}
                to="/solutions/$vertical"
                params={{ vertical: slug }}
                className="flex items-center justify-between rounded-sm border border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/40 px-5 py-4 text-sm text-[var(--oix-cream)]/80"
              >
                {t.verticals[slug].name}
                <ArrowRight className="h-4 w-4 text-[var(--oix-gold)]" />
              </Link>
            ))}
          </div>
        </div>
      </SectionShell>
    </OixLayout>
  );
}
