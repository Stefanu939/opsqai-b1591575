import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { BLOG_POSTS, CONTENT_ROADMAP } from "@/content/manifest";
import { ArrowRight, Clock } from "lucide-react";

export const Route = createFileRoute("/blog/")({
  head: () =>
    pageHead({
      title: "Blog — OPSQAI on Enterprise AI, Knowledge & Operations",
      description:
        "Perspectives on enterprise AI, operational knowledge, warehouse AI and compliance. Educational articles for logistics leaders — no hype, no filler.",
      path: "/blog",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Resources", path: "/resources" },
        { name: "Blog", path: "/blog" },
      ],
    }),
  component: BlogIndex,
});

function BlogIndex() {
  const posts = BLOG_POSTS;
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>{" "}
        <span className="mx-2">/</span>
        <Link to="/resources" className="hover:text-foreground">
          Resources
        </Link>{" "}
        <span className="mx-2">/</span>
        <span className="text-foreground">Blog</span>
      </nav>
      <header className="mb-14 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">Blog</p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Ideas worth reading before you buy AI for your operations.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Independent, educational writing on enterprise AI, knowledge management and audit
          readiness — not marketing copy dressed as thought leadership.
        </p>
      </header>

      {posts.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-10">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Coming soon</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            The editorial calendar is loading.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            OPSQAI is publishing 12–15 hand-crafted articles across six pillars before opening the
            blog to the wider web. Each piece is educational, source-cited and grounded in real
            logistics operations. A preview of what's coming:
          </p>
          <ul className="mt-6 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            {CONTENT_ROADMAP.blog.map((title) => (
              <li
                key={title}
                className="rounded-lg border border-border/50 bg-background/40 px-4 py-3"
              >
                {title}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/guides"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-card"
            >
              Read the guides <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get notified <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="group rounded-2xl border border-border/60 bg-card/50 p-6 transition hover:border-primary/50 hover:bg-card"
            >
              <p className="text-xs font-medium uppercase tracking-widest text-primary">
                {p.pillar}
              </p>
              <h2 className="mt-3 text-xl font-semibold text-foreground">{p.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {p.readingMinutes} min read ·{" "}
                {new Date(p.datePublished).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
