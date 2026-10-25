import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { BLOG_POSTS, formatDate } from "@/content/blog";
import { ArrowRight } from "lucide-react";
import { EditorialHeadline } from "@/components/oix/editorial-headline";
import { PainBand } from "@/components/oix/pain-band";
import { useBenchmarkCopy } from "@/i18n/pages/benchmarks";
import { useT } from "@/i18n";
import { OPERATIONAL_RESEARCH } from "@/content/operational-research";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/blog/")({
  head: () =>
    pageHead({
      title: "Studii, analize de piață și produs — OPSQAI Blog",
      description:
        "Analize OPSQAI pe cercetări Microsoft și Coveo: costul informației, cunoștințe fragmentate și scenarii operaționale transparente. Note despre produs și securitate.",
      path: "/blog",
      ogImage: null,
      keywords: "OPSQAI blog, self-hosted, RAG, Windows Server, on-prem AI, Ollama, operational AI",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
      ],
    }),
  component: BlogIndex,
});

function BlogIndex() {
  const t = useBenchmarkCopy();
  const { lang } = useT();
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <>
      <section className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <EditorialHeadline as="h1" size="xl" eyebrow="OPSQAI / Blog">{t.blogTitle}</EditorialHeadline>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl">
          {t.blogIntro}
        </p>
        <Button asChild variant="outline" className="mt-6"><Link to="/studies">{t.nav}<ArrowRight className="h-4 w-4" /></Link></Button>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24">
        <ul className="divide-y divide-border/60 border-y border-border/60">
          {posts.map((post) => {
            const study = OPERATIONAL_RESEARCH.find(item => item.slug === post.slug);
            return (
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
                    {study?.text[lang].title ?? post.title}
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {study ? `${study.metric} ${study.text[lang].finding}` : post.description}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {post.author} · {post.readingMinutes} min read
                  </p>
                </div>
                <ArrowRight className="hidden md:block h-4 w-4 text-muted-foreground group-hover:text-[color:var(--gold)] transition-colors" />
              </Link>
            </li>
          ); })}
        </ul>
      </section>

      <PainBand page="blog" />
    </>
  );
}
