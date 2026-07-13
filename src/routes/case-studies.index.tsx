import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { CASE_STUDIES, CONTENT_ROADMAP } from "@/content/manifest";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/case-studies/")({
  head: () =>
    pageHead({
      title: "Case Studies — Enterprise AI in Logistics & Warehousing",
      description:
        "Illustrative rollouts of OPSQAI across warehouses, distribution centers and 3PL operations. Operational context, approach, and measurable outcomes.",
      path: "/case-studies",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Resources", path: "/resources" },
        { name: "Case Studies", path: "/case-studies" },
      ],
    }),
  component: CaseStudiesIndex,
});

function CaseStudiesIndex() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/resources" className="hover:text-foreground">
          Resources
        </Link>{" "}
        <span className="mx-2">/</span>
        <span className="text-foreground">Case Studies</span>
      </nav>
      <header className="mb-14 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Case Studies
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Operational rollouts, told honestly.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Real-world patterns from OPSQAI deployments. Named customer stories are added as they
          publish; illustrative narratives are clearly labelled and grounded in typical operational
          context.
        </p>
      </header>

      {CASE_STUDIES.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-10">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Coming soon</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            Two illustrative case studies in draft.
          </h2>
          <ul className="mt-6 grid gap-2 text-sm text-muted-foreground">
            {CONTENT_ROADMAP.caseStudies.map((title) => (
              <li
                key={title}
                className="rounded-lg border border-border/50 bg-background/40 px-4 py-3"
              >
                {title}
              </li>
            ))}
          </ul>
          <Link
            to="/demo"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            See the live demo workspace <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {CASE_STUDIES.map((c) => (
            <Link
              key={c.slug}
              to="/case-studies/$slug"
              params={{ slug: c.slug }}
              className="group rounded-2xl border border-border/60 bg-card/50 p-6 transition hover:border-primary/50 hover:bg-card"
            >
              <p className="text-xs font-medium uppercase tracking-widest text-primary">
                {c.industry} · Illustrative
              </p>
              <h2 className="mt-3 text-xl font-semibold text-foreground">{c.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
