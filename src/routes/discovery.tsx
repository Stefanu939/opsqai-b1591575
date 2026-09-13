import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText,
  LayoutGrid,
  Calculator,
  Rocket,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { pageHead, breadcrumbLd } from "@/lib/seo";
import { OixLayout } from "@/components/oix/oix-layout";
import { SectionShell } from "@/components/oix/section-shell";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { DiscoverySteps } from "@/components/oix/discovery-steps";
import { PainToSolution } from "@/components/oix/pain-to-solution";
import { discoveryCopyEn, useDiscoveryCopy } from "@/i18n/pages/discovery";

export const Route = createFileRoute("/discovery")({
  head: () =>
    pageHead({
      title: discoveryCopyEn.discovery.meta.title,
      description: discoveryCopyEn.discovery.meta.description,
      path: "/discovery",
      keywords:
        "OPSQAI Discovery, operational problem diagnosis, root cause analysis, workspace configuration, value estimate, 30-day pilot",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Discovery", path: "/discovery" },
      ],
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Discovery", path: "/discovery" },
        ]),
      ],
    }),
  component: DiscoveryPage,
});

const DELIVERABLE_ICONS = [FileText, LayoutGrid, Calculator, Rocket];

function DiscoveryPage() {
  const t = useDiscoveryCopy().discovery;

  return (
    <OixLayout>
      <SectionShell className="pt-24 md:pt-32">
        <div className="max-w-4xl">
          <EditorialHeadline as="h1" size="xl" eyebrow={<span>{t.eyebrow}</span>}>
            {t.h1a}
            <br className="hidden sm:block" /> {t.h1b}
          </EditorialHeadline>
          <p className="mt-8 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {t.intro}
          </p>
        </div>
      </SectionShell>

      <DiscoverySteps />
      <PainToSolution />

      <SectionShell className="oix-hairline-top">
        <div className="max-w-3xl">
          <h2 className="oix-display text-4xl md:text-5xl">{t.deliverablesTitle}</h2>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2">
          {t.deliverables.map((d, i) => {
            const Icon = DELIVERABLE_ICONS[i];
            return (
              <div key={d.name} className="bg-card p-6">
                <Icon className="h-5 w-5 text-primary" strokeWidth={1.6} />
                <div className="mt-3 font-display text-xl font-semibold text-foreground">
                  {d.name}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
              </div>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell className="oix-hairline-top">
        <div className="max-w-3xl">
          <h2 className="oix-display text-3xl md:text-4xl">{t.notTitle}</h2>
          <ul className="mt-8 space-y-3">
            {t.notItems.map((n) => (
              <li key={n} className="flex items-start gap-3 text-sm text-foreground/90">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={1.6} />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </SectionShell>

      <SectionShell className="oix-hairline-top">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="oix-display text-4xl md:text-5xl">{t.ctaTitle}</h2>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">{t.ctaBody}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/contact"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-[var(--oix-emerald)] px-5 py-3 text-sm font-semibold text-[var(--oix-primary-ink)] transition-colors hover:bg-[var(--oix-emerald-strong)]"
            >
              {t.ctaPrimary}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center rounded-sm border border-[var(--oix-border-strong)] px-5 py-3 text-sm font-semibold text-[var(--oix-cream)] transition-colors hover:bg-[var(--oix-surface)]"
            >
              {t.ctaSecondary}
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">{t.formHint}</p>
        </div>
      </SectionShell>
    </OixLayout>
  );
}
