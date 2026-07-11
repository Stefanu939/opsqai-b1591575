import { createFileRoute, Link } from "@tanstack/react-router";
import { DOC_BOOKS, DOC_VERSION } from "@/lib/docs-catalog";
import { BookOpen, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/docs/")({
  head: () => ({
    meta: [
      { title: "Documentation — OPSQAI" },
      { name: "description", content: "OPSQAI in-app documentation library." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InAppDocsIndex,
});

function InAppDocsIndex() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
          Documentation · v{DOC_VERSION}
        </p>
        <h1 className="text-3xl font-semibold text-foreground">Books</h1>
        <p className="mt-2 text-muted-foreground">
          Five customer-facing books plus the internal Engineering Handbook (internal deployments
          only). Each book is chapter-indexed.
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {DOC_BOOKS.filter((b) => b.public).map((book) => (
          <Link
            key={book.slug}
            to="/app/docs/$book"
            params={{ book: book.slug }}
            className="group rounded-xl border border-border/60 bg-card p-5 transition hover:border-primary/50"
          >
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="mt-3 font-medium text-foreground">{book.title}</h2>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              {book.audience}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{book.summary}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
              Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
