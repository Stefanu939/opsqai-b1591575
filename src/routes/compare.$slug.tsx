import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Check, Minus } from "lucide-react";
import { OixLayout } from "@/components/oix/oix-layout";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { SectionShell } from "@/components/oix/section-shell";
import { pageHead } from "@/lib/seo";
import {
  COMPETITOR_NAMES,
  COMPETITOR_SLUGS,
  competitorMeta,
  useCompetitorCopy,
  type CompetitorSlug,
} from "@/i18n/pages/competitors";

const isSlug = (s: string): s is CompetitorSlug => (COMPETITOR_SLUGS as readonly string[]).includes(s);

export const Route = createFileRoute("/compare/$slug")({
  loader: ({ params }) => {
    if (!isSlug(params.slug)) throw notFound();
    return { slug: params.slug };
  },
  head: ({ params }) => {
    if (!isSlug(params.slug)) return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    const m = competitorMeta(params.slug);
    return pageHead({
      title: m.title,
      description: m.description,
      path: `/compare/${params.slug}`,
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Compare", path: "/compare" },
        { name: COMPETITOR_NAMES[params.slug], path: `/compare/${params.slug}` },
      ],
    });
  },
  component: CompetitorPage,
});

function CompetitorPage() {
  const { slug } = Route.useLoaderData();
  const c = useCompetitorCopy(slug);

  return (
    <OixLayout>
      <section className="border-b border-[var(--oix-gold-line)]">
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-32 md:pt-40">
          <EditorialHeadline as="h1" size="xl" eyebrow={c.ui.eyebrow} serifAccent={c.name} className="max-w-4xl">
            {c.ui.vs}
          </EditorialHeadline>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--oix-cream-dim)]">{c.intro}</p>
        </div>
      </section>

      <SectionShell>
        <div className="mx-auto max-w-5xl">
          <div className="hidden grid-cols-[1fr_1.2fr_1.2fr] gap-4 pb-4 md:grid">
            <div />
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{c.name}</p>
            <p className="text-sm font-semibold uppercase tracking-wide text-foreground">{c.ui.us}</p>
          </div>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {c.rows.map((row) => (
              <div key={row.topic} className="grid gap-4 p-5 md:grid-cols-[1fr_1.2fr_1.2fr] md:gap-6 md:p-6">
                <h2 className="text-base font-semibold text-foreground">{row.topic}</h2>
                <div className="flex gap-3">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide md:hidden">{c.name}</span>
                    {row.them}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <p className="text-sm leading-relaxed text-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide md:hidden">{c.ui.us}</span>
                    {row.us}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{c.ui.fair}</p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/pilot" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
              {c.ui.cta} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/compare" className="inline-flex items-center rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground">
              {c.ui.all}
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-2">
            {COMPETITOR_SLUGS.filter((s) => s !== slug).map((s) => (
              <Link key={s} to="/compare/$slug" params={{ slug: s }} className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground">
                vs {COMPETITOR_NAMES[s]}
              </Link>
            ))}
          </div>
        </div>
      </SectionShell>
    </OixLayout>
  );
}
