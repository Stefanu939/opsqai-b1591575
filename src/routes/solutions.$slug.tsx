import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead, softwareApplicationLd, faqLd } from "@/lib/seo";
import { findSolution } from "@/content/solutions/data";

export const Route = createFileRoute("/solutions/$slug")({
  loader: ({ params }) => {
    const solution = findSolution(params.slug);
    if (!solution) throw notFound();
    return { solution };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Solution not found — OPSQAI" }, { name: "robots", content: "noindex" }] };
    }
    const { solution } = loaderData;
    const path = `/solutions/${params.slug}`;
    return pageHead({
      title: solution.title,
      description: solution.description,
      path,
      keywords: solution.keywords,
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Solutions", path: "/solutions" },
        { name: solution.h1, path },
      ],
      jsonLd: [
        softwareApplicationLd({
          name: `OPSQAI — ${solution.h1}`,
          description: solution.description,
          url: `https://opsqai.de${path}`,
        }),
        ...(solution.faq && solution.faq.length > 0 ? [faqLd(solution.faq.map((f) => ({ question: f.question, answer: f.answer })))] : []),
      ],
    });
  },
  component: SolutionDetailPage,
  notFoundComponent: () => (
    <MarketingLayout>
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Solution not found</h1>
        <Link to="/solutions" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">All solutions</Link>
      </main>
    </MarketingLayout>
  ),
});

function SolutionDetailPage() {
  const { solution } = Route.useLoaderData();
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-4xl px-4 pt-16 pb-10 md:pt-24">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <Link to="/solutions" className="hover:text-foreground">Solutions</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{solution.eyebrow}</span>
        </nav>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{solution.eyebrow}</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight text-foreground">{solution.h1}</h1>
        <p className="mt-5 text-lg text-muted-foreground">{solution.lede}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild><Link to="/contact">Book a working session</Link></Button>
          <Button asChild variant="outline"><Link to="/demo">Try the live demo</Link></Button>
        </div>
      </section>

      {solution.sections.map((sec) => (
        <section key={sec.heading} className="mx-auto max-w-3xl px-4 py-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{sec.heading}</h2>
          {sec.paragraphs.map((p, i) => (
            <p key={i} className="mt-4 text-muted-foreground leading-relaxed">{p}</p>
          ))}
          {sec.bullets && (
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              {sec.bullets.map((b) => <li key={b}>· {b}</li>)}
            </ul>
          )}
        </section>
      ))}

      <section className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Underlying capabilities</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {solution.capabilities.map((c) => (
            <Card key={c.title} className="p-5 border-border/60">
              <h3 className="font-semibold text-foreground">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {solution.faq && solution.faq.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-10">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Frequently asked</h2>
          <dl className="mt-6 space-y-6">
            {solution.faq.map((f) => (
              <div key={f.question}>
                <dt className="font-medium text-foreground">{f.question}</dt>
                <dd className="mt-2 text-muted-foreground">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {solution.relatedLandingPages && solution.relatedLandingPages.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-10">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Related</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {solution.relatedLandingPages.map((r) => (
              <li key={r.path}><a href={r.path} className="text-foreground hover:text-primary">{r.label} →</a></li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-4xl px-4 pb-24 pt-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">See it on your documents.</h2>
        <p className="mt-2 text-muted-foreground">A 20-minute working session with your real SOPs.</p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Button asChild><Link to="/contact">Book a demo</Link></Button>
          <Button asChild variant="outline"><Link to="/pricing">See pricing</Link></Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
