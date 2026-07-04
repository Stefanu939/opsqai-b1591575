import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { ArrowRight, BookOpen, Users, Settings, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () =>
    pageHead({
      title: "Documentation — OPSQAI Enterprise AI Platform",
      description:
        "Product references and administrator guides for OPSQAI: knowledge ingestion, RAG configuration, role-based access, audit logs and multi-tenant governance.",
      path: "/docs",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Resources", path: "/resources" },
        { name: "Documentation", path: "/docs" },
      ],
    }),
  component: DocsIndex,
});

const sections = [
  { icon: BookOpen, title: "Getting Started", body: "Onboard your first workspace, ingest documents and validate answers.", link: "/product" },
  { icon: Users, title: "User & Role Management", body: "Permissions across departments and sites, scoped by row-level security.", link: "/features" },
  { icon: Settings, title: "Knowledge & Ingestion", body: "Supported formats, chunking strategy, refresh cadence and versioning.", link: "/product" },
  { icon: ShieldCheck, title: "Security & Governance", body: "Encryption, audit logs, multi-tenant isolation and GDPR posture.", link: "/trust" },
] as const;

function DocsIndex() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/resources" className="hover:text-foreground">Resources</Link> <span className="mx-2">/</span>
        <span className="text-foreground">Documentation</span>
      </nav>
      <header className="mb-14 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-primary">Documentation</p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">Everything a workspace admin needs to run OPSQAI in production.</h1>
        <p className="mt-5 text-lg text-muted-foreground">The documentation surface is being consolidated. In the meantime, the sections below point to the current authoritative pages.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.title} to={s.link} className="group rounded-2xl border border-border/60 bg-card/50 p-6 transition hover:border-primary/50 hover:bg-card">
            <s.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">Read <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
          </Link>
        ))}
      </div>
    </main>
  );
}
