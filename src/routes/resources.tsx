import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { ArrowRight, BookOpen, FileText, Layers, LifeBuoy, Newspaper } from "lucide-react";

export const Route = createFileRoute("/resources")({
  head: () =>
    pageHead({
      title: "Resources — OPSQAI Enterprise AI Knowledge Hub",
      description:
        "Guides, articles, case studies and documentation on enterprise AI, operational knowledge, warehouse SOPs and audit readiness. Educational content for logistics and supply-chain leaders.",
      path: "/resources",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Resources", path: "/resources" },
      ],
    }),
  component: ResourcesHub,
});

const sections = [
  {
    to: "/blog",
    icon: Newspaper,
    title: "Blog",
    body: "Perspectives on enterprise AI, knowledge management and operational excellence.",
  },
  {
    to: "/guides",
    icon: BookOpen,
    title: "Guides",
    body: "Long-form, step-by-step playbooks for digitizing SOPs and rolling out AI safely.",
  },
  {
    to: "/case-studies",
    icon: Layers,
    title: "Case Studies",
    body: "Illustrative rollouts across warehouses, distribution centers and 3PL operations.",
  },
  {
    to: "/docs",
    icon: FileText,
    title: "Documentation",
    body: "Product references and integration notes for administrators and implementers.",
  },
  {
    to: "/help",
    icon: LifeBuoy,
    title: "Help Center",
    body: "Frequently asked questions from operators, admins and platform superusers.",
  },
] as const;

function ResourcesHub() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>{" "}
        <span className="mx-2">/</span> <span className="text-foreground">Resources</span>
      </nav>
      <header className="mb-14 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">
          Resources
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Enterprise AI, operational knowledge and audit readiness — in one hub.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Educational content for logistics and supply-chain leaders. Grounded in the same
          principles OPSQAI is built on: source-backed AI, governance, and repeatable operations.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="group rounded-2xl border border-border/60 bg-card/50 p-6 transition hover:border-primary/50 hover:bg-card"
          >
            <s.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
