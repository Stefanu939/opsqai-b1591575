import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/seo";
import { BookOpen, Shield, Code2, Wrench, Boxes, Building2 } from "lucide-react";

export const Route = createFileRoute("/documentation/")({
  head: () =>
    pageHead({
      title: "Documentation — OPSQAI",
      description:
        "OPSQAI documentation: administrator guide, architecture handbook, product, security, technical reference, engineering handbook.",
      path: "/documentation",
      keywords:
        "OPSQAI documentation, administrator guide, architecture, docker, self-hosted, RAG pipeline",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Documentation", path: "/documentation" },
      ],
    }),
  component: DocumentationIndex,
});

const BOOKS = [
  {
    icon: Wrench,
    title: "Administrator Guide",
    body: "Install, configure, and operate OPSQAI self-hosted with Docker Compose on Windows Server, Linux, or any OCI host. Prerequisites, first-run wizard, PostgreSQL, object storage, SMTP, SSO, AI provider, license, backups, updates, troubleshooting.",
    href: "/documentation/administrator-guide",
  },
  {
    icon: Building2,
    title: "Architecture Handbook",
    body: "How OPSQAI is built end to end: containers, data flow, license system, RAG pipeline, security model, storage adapters, deployment topology.",
    href: "/documentation/architecture",
  },
  {
    icon: Boxes,
    title: "Product Documentation",
    body: "What OPSQAI is, why it exists, what each module does, how licensing works, how AI answers stay grounded in your knowledge base.",
    href: "/documentation/product",
  },
  {
    icon: Shield,
    title: "Security Documentation",
    body: "Encryption at rest and in transit, RLS, license security, update signing, backup encryption, audit logging, DR/BC, incident response.",
    href: "/documentation/security",
  },
  {
    icon: Code2,
    title: "Technical Reference",
    body: "docker-compose reference, environment variables, ports, volumes, AI adapter contract, RAG pipeline internals, embeddings, storage adapters, public API, jobs, database schema.",
    href: "/documentation/technical",
  },
  {
    icon: BookOpen,
    title: "Engineering Handbook",
    body: "Conventions, release process, adding modules, issuing licenses, adding AI adapters, publishing container images, migrations, pre-release checklist.",
    href: "/documentation/engineering",
  },
];

function DocumentationIndex() {
  return (
    <>
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Documentation</p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          Everything, written down.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-3xl">
          OPSQAI ships as a self-hosted platform. These books cover installation with Docker,
          architecture, security, product, technical reference, and engineering. Customer-specific
          runbooks live inside the Customer Portal.
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
                <Link to={b.href}>Open →</Link>
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
    </>
  );
}
