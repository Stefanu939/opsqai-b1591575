import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";
import { BookOpen, Shield, Code2, Wrench, Boxes, Building2 } from "lucide-react";

export const Route = createFileRoute("/documentation")({
  head: () =>
    pageHead({
      title: "Documentation — OPSQAI",
      description:
        "Documentation for OPSQAI: administrator guide, architecture handbook, security overview, technical reference, and engineering runbooks.",
      path: "/documentation",
      keywords:
        "OPSQAI documentation, administrator guide, architecture, technical documentation, RAG pipeline",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Documentation", path: "/documentation" },
      ],
    }),
  component: DocumentationPage,
});

const BOOKS = [
  {
    icon: Wrench,
    title: "Administrator Guide",
    body: "Install, configure, and operate OPSQAI on Windows Server. Covers prerequisites, setup wizard, PostgreSQL, object storage, SMTP, SSO, AI provider, license management, backups, restore, updates, and troubleshooting.",
    href: "/documentation/administrator-guide",
  },
  {
    icon: Building2,
    title: "Architecture Handbook",
    body: "How OPSQAI is built end to end: vision, architecture, data flow, license system, security model, AI, knowledge base, deployment, updates, maintenance, and recovery.",
    href: "/documentation/architecture",
  },
  {
    icon: Boxes,
    title: "Product Documentation",
    body: "What OPSQAI is, why it exists, how modules work, how licensing works, and how AI answers stay grounded in your knowledge.",
    href: "/documentation/product",
  },
  {
    icon: Shield,
    title: "Security Documentation",
    body: "Encryption, authentication, authorization, license security, update security, backup security, data isolation, privacy, audit logging, incident response, DR/BC.",
    href: "/documentation/security",
  },
  {
    icon: Code2,
    title: "Technical Reference",
    body: "Project structure, auth flow, license flow, AI adapter contract, RAG pipeline, embeddings, storage adapters, public API, deployment, background jobs, security controls, database schema.",
    href: "/documentation/technical",
  },
  {
    icon: BookOpen,
    title: "Engineering Handbook",
    body: "Conventions, release process, adding modules, issuing licenses, adding AI adapters, publishing Docker, migrations, and the pre-release checklist.",
    href: "/documentation/engineering",
  },
];

function DocumentationPage() {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Documentation</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          Everything, written down.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          OPSQAI ships with a full documentation set covering installation, architecture,
          security, and engineering practices. Public books below; customer-specific runbooks are
          available in the Customer Portal.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BOOKS.map((b) => (
            <Card key={b.title} className="p-6 border-border/60 flex flex-col">
              <b.icon className="h-6 w-6 text-primary" />
              <div className="mt-4 font-semibold">{b.title}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">{b.body}</p>
              <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
                <a href={b.href}>Open →</a>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-surface-1 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Looking for install-specific docs?</h2>
          <p className="mt-3 text-muted-foreground">
            Customer contacts can browse install-scoped documentation and release notes inside the
            Customer Portal.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Button asChild>
              <Link to="/portal/documentation">Open Customer Portal</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
