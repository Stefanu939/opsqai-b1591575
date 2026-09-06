import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";
import { BookOpen, Shield, Code2, Wrench, Boxes, Building2 } from "lucide-react";
import { useDocumentationCopy } from "@/i18n/pages/documentation";
import { EditorialHeadline } from "@/components/oix/editorial-headline";

export const Route = createFileRoute("/documentation/")({
  head: () =>
    pageHead({
      title: "Documentation — OPSQAI",
      description:
        "OPSQAI documentation: administrator guide, architecture handbook, product, security, technical reference, engineering handbook.",
      path: "/documentation",
      keywords:
        "OPSQAI documentation, administrator guide, architecture, Windows self-hosted, operational AI",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Documentation", path: "/documentation" },
      ],
    }),
  component: DocumentationIndex,
});

const BOOK_META = [
  { icon: Wrench, href: "/documentation/administrator-guide" },
  { icon: Building2, href: "/documentation/architecture" },
  { icon: Boxes, href: "/documentation/product" },
  { icon: Shield, href: "/documentation/security" },
  { icon: Code2, href: "/documentation/technical" },
  { icon: BookOpen, href: "/documentation/engineering" },
] as const;

function DocumentationIndex() {
  const t = useDocumentationCopy();
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <EditorialHeadline as="h1" size="xl" eyebrow={t.hero.eyebrow}>{t.hero.headline}</EditorialHeadline>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          {t.hero.body} <Link to="/blog" className="text-[color:var(--gold)] hover:underline">{t.hero.blogLink}</Link>{t.hero.bodyEnd}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {t.books.map((b, i) => {
            const meta = BOOK_META[i];
            return (
              <Card key={b.title} className="p-6 border-border/60 flex flex-col">
                <meta.icon className="h-6 w-6 text-primary" />
                <div className="mt-4 font-semibold">{b.title}</div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">{b.body}</p>
                <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
                  <Link to={meta.href}>{t.openBook}</Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="bg-surface-1 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t.installSpecific.headline}</h2>
          <p className="mt-3 text-muted-foreground">
            {t.installSpecific.body}
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button asChild>
              <Link to="/portal">{t.installSpecific.ctaPrimary}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">{t.installSpecific.ctaSecondary}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
