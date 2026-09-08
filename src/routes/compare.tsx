import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, X } from "lucide-react";
import { OixLayout } from "@/components/oix/oix-layout";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { pageHead } from "@/lib/seo";
import { useCompareCopy } from "@/i18n/pages/compare";

export const Route = createFileRoute("/compare")({
  head: () =>
    pageHead({
      title: "OPSQAI vs. the way you work today — honest comparison",
      description:
        "A direct comparison: folders, chat archaeology and public AI tools vs. OPSQAI Self-Hosted. No invented numbers — just the same week, twice.",
      path: "/compare",
      keywords: "OPSQAI comparison, self-hosted AI vs public AI, knowledge management alternative",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Compare", path: "/compare" },
      ],
    }),
  component: ComparePage,
});

function ComparePage() {
  const t = useCompareCopy();

  return (
    <OixLayout>
      <section className="relative overflow-hidden border-b border-[var(--oix-gold-line)]">
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-32 md:pt-40">
          <EditorialHeadline as="h1" size="xl" eyebrow={t.eyebrow} serifAccent={t.serifAccent} className="max-w-4xl">
            {t.headline}
          </EditorialHeadline>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--oix-cream-dim)]">{t.body}</p>
        </div>
      </section>

      <SectionShell>
        <div className="mx-auto max-w-5xl">
          <div className="hidden grid-cols-[1fr_1.2fr_1.2fr] gap-4 pb-4 md:grid">
            <div />
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t.todayCol}</p>
            <p className="text-sm font-semibold uppercase tracking-wide text-foreground">{t.opsqaiCol}</p>
          </div>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {t.rows.map((row) => (
              <div
                key={row.topic}
                className="grid gap-4 p-5 md:grid-cols-[1fr_1.2fr_1.2fr] md:items-start md:gap-6 md:p-6"
              >
                <h2 className="text-base font-semibold text-foreground">{row.topic}</h2>
                <div className="flex gap-3">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide md:hidden">
                      {t.todayCol}
                    </span>
                    {row.today}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                  <p className="text-sm leading-relaxed text-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide md:hidden">
                      {t.opsqaiCol}
                    </span>
                    {row.opsqai}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="text-xl font-semibold text-foreground">{t.honestyTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.honestyBody}</p>
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 md:p-8">
            <h2 className="text-xl font-semibold text-foreground">{t.pilotSlotTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.pilotSlotBody}</p>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <Link
            to="/pilot"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {t.ctaPrimary}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to="/pricing"
            className="text-sm font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
          >
            {t.ctaSecondary}
          </Link>
        </div>
      </SectionShell>
    </OixLayout>
  );
}
