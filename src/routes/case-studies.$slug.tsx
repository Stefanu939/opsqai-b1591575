import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { pageHead, articleLd } from "@/lib/seo";
import { findCaseStudy } from "@/content/manifest";

export const Route = createFileRoute("/case-studies/$slug")({
  loader: ({ params }) => {
    const study = findCaseStudy(params.slug);
    if (!study) throw notFound();
    return { study };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [{ title: "Case study not found — OPSQAI" }, { name: "robots", content: "noindex" }],
      };
    const { study } = loaderData;
    const path = `/case-studies/${study.slug}`;
    return pageHead({
      title: `${study.title} — OPSQAI Case Study`,
      description: study.description,
      path,
      ogType: "article",
      keywords: study.keywords,
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Case Studies", path: "/case-studies" },
        { name: study.title, path },
      ],
      jsonLd: [
        articleLd({
          title: study.title,
          description: study.description,
          path,
          datePublished: study.datePublished,
          authorName: "OPSQAI Editorial",
          section: "Case Studies",
        }),
      ],
    });
  },
  component: CaseStudyPage,
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">Case study not found</h1>
      <Link
        to="/case-studies"
        className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        All case studies
      </Link>
    </main>
  ),
});

function CaseStudyPage() {
  const { study } = Route.useLoaderData() as {
    study: import("@/content/case-studies/_types").CaseStudy;
  };
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/case-studies" className="hover:text-foreground">
          Case Studies
        </Link>{" "}
        <span className="mx-2">/</span>
        <span className="text-foreground">{study.title}</span>
      </nav>
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
          {study.industry} · Illustrative narrative
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          {study.title}
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">{study.lede}</p>
        <p className="mt-4 rounded-md border border-border/60 bg-card/40 px-4 py-3 text-xs text-muted-foreground">
          This case study is <strong className="text-foreground">illustrative</strong>. It reflects
          patterns and metrics from typical OPSQAI deployments and is not attributed to a named
          customer.
        </p>
      </header>
      <dl className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {study.metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border/60 bg-card/40 p-4">
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">{m.label}</dt>
            <dd className="mt-2 text-xl font-semibold text-foreground">{m.value}</dd>
          </div>
        ))}
      </dl>
      <section>
        <h2 className="text-2xl font-semibold text-foreground">Challenge</h2>
        {study.challenge.map((p, i) => (
          <p key={i} className="mt-4 text-muted-foreground">
            {p}
          </p>
        ))}
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-foreground">Approach</h2>
        {study.approach.map((p, i) => (
          <p key={i} className="mt-4 text-muted-foreground">
            {p}
          </p>
        ))}
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-foreground">Outcome</h2>
        {study.outcome.map((p, i) => (
          <p key={i} className="mt-4 text-muted-foreground">
            {p}
          </p>
        ))}
      </section>
    </main>
  );
}
