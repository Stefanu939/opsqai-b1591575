import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { findBook } from "@/lib/docs-catalog";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/docs/$book")({
  loader: ({ params }) => {
    const book = findBook(params.book);
    if (!book) throw notFound();
    return { book };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.book.title ?? "Documentation"} — OPSQAI` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BookView,
  notFoundComponent: () => <div className="p-6 text-muted-foreground">Book not found.</div>,
  errorComponent: ({ error }) => (
    <div className="p-6 text-destructive">Failed to load book: {String(error)}</div>
  ),
});

function BookView() {
  const { book } = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link
        to="/app/docs"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All books
      </Link>
      <header className="mb-8 border-b border-border/60 pb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          {book.audience}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">{book.title}</h1>
        <p className="mt-2 text-muted-foreground">{book.summary}</p>
      </header>
      <ol className="space-y-2">
        {book.chapters.map((ch: { slug: string; title: string }, i: number) => (
          <li
            key={ch.slug}
            className="flex items-baseline gap-3 rounded-lg border border-border/40 bg-card/40 px-4 py-3"
          >
            <span className="text-xs tabular-nums text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-foreground">{ch.title}</span>
            <code className="ml-auto text-xs text-muted-foreground">
              docs/{book.slug}/{ch.slug}.md
            </code>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-xs text-muted-foreground">
        Source Markdown lives in the repo under <code>docs/{book.slug}/</code>. The in-app renderer
        loads chapter files from disk; the customer portal exports the same content as a signed PDF.
      </p>
    </div>
  );
}
