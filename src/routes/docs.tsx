import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { DOC_BOOKS, DOC_VERSION, DOC_CUT_DATE } from "@/lib/docs-catalog";
import { BookOpen, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () =>
    pageHead({
      title: "Documentation — OPSQAI Enterprise AI Platform",
      description:
        "The five OPSQAI books for v1.0: Product, Administrator, Technical, Security, and the Architecture Book. Rendered in-app and exportable as PDF for authenticated customers.",
      path: "/docs",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Resources", path: "/resources" },
        { name: "Documentation", path: "/docs" },
      ],
    }),
  component: DocsIndex,
});

const publicBooks = DOC_BOOKS.filter((b) => b.public);

function DocsIndex() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>{" "}
        <span className="mx-2">/</span>
        <span className="text-foreground">Documentation</span>
      </nav>
      <header className="mb-14 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Documentation · v{DOC_VERSION} · {DOC_CUT_DATE}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Five books that describe OPSQAI end to end.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Every book is versioned with the release. Authenticated customers can download each as a
          signed PDF from the Customer Portal. The public web renderings below are always current.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {publicBooks.map((book) => (
          <article
            key={book.slug}
            className="rounded-2xl border border-border/60 bg-card/50 p-6 transition hover:border-primary/50 hover:bg-card"
          >
            <BookOpen className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">{book.title}</h2>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              For {book.audience}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{book.summary}</p>
            <p className="mt-4 text-xs text-muted-foreground">{book.chapters.length} chapters</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Preview via the app <ArrowRight className="h-4 w-4" />
            </span>
          </article>
        ))}
      </div>
      <section className="mt-14 rounded-2xl border border-border/60 bg-muted/20 p-6">
        <h2 className="text-lg font-semibold text-foreground">Customers</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Authenticated customers see the full docs rendered in-app at{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/app/docs</code>, and can download
          PDF versions from the{" "}
          <Link to="/portal" className="text-primary hover:underline">
            Customer Portal
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
