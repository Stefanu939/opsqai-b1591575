import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { pageHead, howToLd, articleLd } from "@/lib/seo";
import { findGuide } from "@/content/manifest";

export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const guide = findGuide(params.slug);
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Guide not found — OPSQAI" }, { name: "robots", content: "noindex" }] };
    const { guide } = loaderData;
    const path = `/guides/${guide.slug}`;
    return pageHead({
      title: `${guide.title} — OPSQAI Guide`,
      description: guide.description,
      path,
      ogType: "article",
      keywords: guide.keywords,
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Guides", path: "/guides" },
        { name: guide.title, path },
      ],
      jsonLd: [
        howToLd({ title: guide.title, description: guide.description, steps: guide.steps }),
        articleLd({
          title: guide.title,
          description: guide.description,
          path,
          datePublished: guide.datePublished,
          dateModified: guide.dateModified,
          authorName: guide.author.name,
          section: "Guides",
        }),
      ],
    });
  },
  component: GuidePage,
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">Guide not found</h1>
      <Link to="/guides" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">All guides</Link>
    </main>
  ),
});

function GuidePage() {
  const { guide } = Route.useLoaderData() as { guide: import("@/content/guides/_types").Guide };
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/guides" className="hover:text-foreground">Guides</Link> <span className="mx-2">/</span>
        <span className="text-foreground">{guide.title}</span>
      </nav>
      <header className="mb-10">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">{guide.title}</h1>
        <p className="mt-5 text-lg text-muted-foreground">{guide.lede}</p>
        <p className="mt-6 text-sm text-muted-foreground">By {guide.author.name}, {guide.author.role} · {guide.readingMinutes} min read</p>
      </header>
      <ol className="space-y-8">
        {guide.steps.map((s, i) => (
          <li key={s.name} className="rounded-2xl border border-border/60 bg-card/50 p-6">
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Step {i + 1}</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">{s.name}</h2>
            <p className="mt-3 text-muted-foreground">{s.text}</p>
          </li>
        ))}
      </ol>
      {guide.closing && (
        <div className="mt-12 space-y-4">
          {guide.closing.map((p, i) => <p key={i} className="text-muted-foreground">{p}</p>)}
        </div>
      )}
    </main>
  );
}
