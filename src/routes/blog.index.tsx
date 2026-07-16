import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { BLOG_POSTS, formatDate } from "@/content/blog";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/blog/")({
  head: () =>
    pageHead({
      title: "Blog — OPSQAI",
      description:
        "Engineering, product and security notes from the OPSQAI team — how the self-hosted Windows platform is built and operated.",
      path: "/blog",
      keywords: "OPSQAI blog, self-hosted, RAG, Windows Server, on-prem AI, logistics",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
      ],
    }),
  component: BlogIndex,
});

function BlogIndex() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Blog</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          Notes from the OPSQAI team.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl">
          How the self-hosted Windows platform is built, secured and operated. Short posts,
          concrete detail, no marketing filler.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24">
        <ul className="divide-y divide-border/60 border-y border-border/60">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="group grid gap-3 py-8 md:grid-cols-[160px_1fr_auto] md:items-baseline md:gap-8"
              >
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-mono">
                  <div>{formatDate(post.date)}</div>
                  <div className="mt-1 text-[color:var(--gold)]">{post.tag}</div>
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground group-hover:text-[color:var(--gold)] transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {post.description}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {post.author} · {post.readingMinutes} min read
                  </p>
                </div>
                <ArrowRight className="hidden md:block h-4 w-4 text-muted-foreground group-hover:text-[color:var(--gold)] transition-colors" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
