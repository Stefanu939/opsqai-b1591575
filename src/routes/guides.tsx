import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { GUIDES, CONTENT_ROADMAP } from "@/content/manifest";
import { ArrowRight, Clock } from "lucide-react";

export const Route = createFileRoute("/guides")({
  head: () =>
    pageHead({
      title: "Guides — OPSQAI Enterprise AI & Operations Playbooks",
      description:
        "Long-form, step-by-step playbooks: digitizing warehouse SOPs, rolling out AI across a distribution network, preparing for operational audits, and onboarding new hires with AI.",
      path: "/guides",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Resources", path: "/resources" },
        { name: "Guides", path: "/guides" },
      ],
    }),
  component: GuidesIndex,
});

function GuidesIndex() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/resources" className="hover:text-foreground">Resources</Link> <span className="mx-2">/</span>
        <span className="text-foreground">Guides</span>
      </nav>
      <header className="mb-14 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">Guides</p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">Step-by-step playbooks for operational leaders.</h1>
        <p className="mt-5 text-lg text-muted-foreground">Practical, opinionated guides written for teams rolling out enterprise AI across warehouses, distribution centers and 3PL operations.</p>
      </header>

      {GUIDES.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-10">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Coming soon</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Four guides being finalized.</h2>
          <ul className="mt-6 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            {CONTENT_ROADMAP.guides.map((title) => (
              <li key={title} className="rounded-lg border border-border/50 bg-background/40 px-4 py-3">{title}</li>
            ))}
          </ul>
          <Link to="/contact" className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Ask us for an early copy <ArrowRight className="h-4 w-4" /></Link>
        </section>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {GUIDES.map((g) => (
            <Link key={g.slug} to="/guides/$slug" params={{ slug: g.slug }} className="group rounded-2xl border border-border/60 bg-card/50 p-6 transition hover:border-primary/50 hover:bg-card">
              <h2 className="text-xl font-semibold text-foreground">{g.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{g.description}</p>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {g.readingMinutes} min read</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
