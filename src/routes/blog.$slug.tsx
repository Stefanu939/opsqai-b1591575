import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { BLOG_POSTS, formatDate, getPost } from "@/content/blog";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return {
      slug: post.slug,
      title: post.title,
      description: post.description,
      date: post.date,
      author: post.author,
      tag: post.tag,
      readingMinutes: post.readingMinutes,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Not found — OPSQAI Blog" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return pageHead({
      title: `${loaderData.title} — OPSQAI Blog`,
      description: loaderData.description,
      path: `/blog/${loaderData.slug}`,
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: loaderData.title, path: `/blog/${loaderData.slug}` },
      ],
    });
  },
  notFoundComponent: BlogNotFound,
  component: BlogArticle,
});

function BlogNotFound() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Post not found</h1>
      <p className="mt-3 text-muted-foreground">
        This article does not exist or has been retired.
      </p>
      <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-sm text-[color:var(--gold)]">
        <ArrowLeft className="h-4 w-4" /> Back to the blog
      </Link>
    </section>
  );
}

function BlogArticle() {
  const data = Route.useLoaderData();
  const post = getPost(data.slug);
  if (!post) return <BlogNotFound />;
  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-16 md:py-24">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-[color:var(--gold)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Blog
        </Link>
        <div className="mt-6 flex items-center gap-3 text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">
          <span>{formatDate(post.date)}</span>
          <span aria-hidden>·</span>
          <span className="text-[color:var(--gold)]">{post.tag}</span>
          <span aria-hidden>·</span>
          <span>{post.readingMinutes} min read</span>
        </div>
        <h1 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight leading-[1.08]">
          {post.title}
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed">{post.description}</p>
        <p className="mt-4 text-xs text-muted-foreground">By {post.author}</p>
        <div className="mt-10 border-t border-border/60 pt-8">{post.body()}</div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border/60 bg-surface-1">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Keep reading
            </h2>
            <ul className="mt-6 grid gap-6 md:grid-cols-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    to="/blog/$slug"
                    params={{ slug: r.slug }}
                    className="group block rounded-lg border border-border/60 p-6 hover:border-[color:var(--gold-line)] transition-colors"
                  >
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--gold)] font-mono">
                      {r.tag}
                    </div>
                    <div className="mt-3 font-semibold group-hover:text-[color:var(--gold)] transition-colors">
                      {r.title}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {r.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
