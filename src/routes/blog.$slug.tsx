import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { pageHead, articleLd, breadcrumbLd } from "@/lib/seo";
import { findBlogPost } from "@/content/manifest";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = findBlogPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Article not found — OPSQAI" }, { name: "robots", content: "noindex" }] };
    }
    const { post } = loaderData;
    const path = `/blog/${post.slug}`;
    return pageHead({
      title: `${post.title} — OPSQAI Blog`,
      description: post.description,
      path,
      ogType: "article",
      keywords: post.keywords,
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: post.title, path },
      ],
      jsonLd: [
        articleLd({
          title: post.title,
          description: post.description,
          path,
          datePublished: post.datePublished,
          dateModified: post.dateModified,
          authorName: post.author.name,
          section: post.pillar,
        }),
      ],
    });
  },
  component: BlogPostPage,
  notFoundComponent: PostNotFound,
});

function PostNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">Article not found</h1>
      <p className="mt-3 text-muted-foreground">This piece may have moved or is not yet published.</p>
      <Link to="/blog" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Back to the blog</Link>
    </main>
  );
}

function BlogPostPage() {
  const { post } = Route.useLoaderData() as { post: import("@/content/blog/_types").BlogPost };
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/blog" className="hover:text-foreground">Blog</Link> <span className="mx-2">/</span>
        <span className="text-foreground">{post.title}</span>
      </nav>
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{post.pillar}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{post.title}</h1>
        <p className="mt-5 text-lg text-muted-foreground">{post.lede}</p>
        <p className="mt-6 text-sm text-muted-foreground">
          By <span className="text-foreground">{post.author.name}</span>, {post.author.role} · {new Date(post.datePublished).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {post.readingMinutes} min read
        </p>
      </header>
      <article className="prose prose-invert max-w-none">
        {post.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="mt-10 text-2xl font-semibold text-foreground">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-4 text-base leading-relaxed text-muted-foreground">{p}</p>
            ))}
          </section>
        ))}
      </article>
      {(post.relatedLandingPages?.length || post.relatedPosts?.length) && (
        <footer className="mt-16 rounded-2xl border border-border/60 bg-card/50 p-6">
          <h2 className="text-sm font-medium uppercase tracking-widest text-primary">Related reading</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {post.relatedLandingPages?.map((p) => (
              <li key={p}><a href={p} className="text-foreground hover:text-primary">{p}</a></li>
            ))}
          </ul>
        </footer>
      )}
    </main>
  );
}
