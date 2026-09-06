import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead, breadcrumbLd } from "@/lib/seo";
import { OixLayout } from "@/components/oix/oix-layout";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { OixButton } from "@/components/oix/buttons";
import { Card } from "@/components/ui/card";
import {
  SOLUTION_VERTICALS,
  solutionsCopyEn,
  useSolutionsCopy,
} from "@/i18n/pages/solutions";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/solutions/")({
  head: () =>
    pageHead({
      title: solutionsCopyEn.labels.indexMetaTitle,
      description: solutionsCopyEn.labels.indexMetaDescription,
      path: "/solutions",
      keywords:
        "operational AI solutions, logistics AI, HR AI, finance AI, transport fleet AI, self-hosted AI Romania Germany",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Solutions", path: "/solutions" },
      ],
      jsonLd: [
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Solutions", path: "/solutions" },
        ]),
      ],
    }),
  component: SolutionsIndex,
});

function SolutionsIndex() {
  const t = useSolutionsCopy();

  return (
    <OixLayout>
      <section className="border-b border-[var(--oix-gold-line)]/40">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-32 md:px-10 md:pb-24 md:pt-40">
          <EditorialHeadline
            as="h1"
            size="xl"
            eyebrow={t.labels.indexEyebrow}
            serifAccent={t.labels.indexAccent}
          >
            {t.labels.indexTitle}
          </EditorialHeadline>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--oix-cream)]/75">
            {t.labels.indexBody}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <OixButton to="/pilot" variant="gold" withArrow>
              {t.labels.startPilot}
            </OixButton>
            <OixButton to="/resources" variant="ghost">
              {t.labels.getResources}
            </OixButton>
          </div>
        </div>
      </section>

      <SectionShell>
        <div className="grid gap-6 md:grid-cols-2">
          {SOLUTION_VERTICALS.map((slug) => {
            const v = t.verticals[slug];
            return (
              <Card
                key={slug}
                className="border-[var(--oix-gold-line)]/40 bg-[var(--oix-onyx)]/50 p-8"
              >
                <div className="oix-eyebrow text-[10px]">{v.hero.eyebrow}</div>
                <h2 className="oix-display mt-4 text-2xl text-[var(--oix-cream)]">{v.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--oix-cream)]/70">
                  {v.tagline}
                </p>
                <ul className="mt-6 space-y-2">
                  {v.outcomes.map((o) => (
                    <li key={o.label} className="text-sm text-[var(--oix-cream)]/70">
                      <span className="font-semibold text-[var(--oix-gold)]">{o.value}</span>{" "}
                      {o.label}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/solutions/$vertical"
                  params={{ vertical: slug }}
                  className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--oix-gold)]"
                >
                  {t.labels.explore}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            );
          })}
        </div>
      </SectionShell>
    </OixLayout>
  );
}
