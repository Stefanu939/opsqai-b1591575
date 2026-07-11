import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { ShieldCheck, ServerCog, HardDrive } from "lucide-react";

export const Route = createFileRoute("/trust/self-hosted")({
  head: () =>
    pageHead({
      title: "Self-Hosted — Trust — OPSQAI",
      description:
        "OPSQAI runs entirely inside the customer's infrastructure. The vendor never holds customer PG, SMTP, AI provider or storage credentials and has no callback into your install.",
      path: "/trust/self-hosted",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Trust", path: "/trust" },
        { name: "Self-Hosted", path: "/trust/self-hosted" },
      ],
    }),
  component: SelfHostedTrust,
});

function SelfHostedTrust() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">Trust</p>
      <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
        Your install, your infrastructure, your data.
      </h1>
      <p className="mt-4 text-muted-foreground">
        This page is maintained by OPSQAI to explain how the self-hosted model works. It describes
        enabled controls and current practices; it is not a certification.
      </p>
      <section className="mt-10 space-y-6">
        <Card icon={ServerCog} title="Where the data lives">
          Every install runs inside the customer's own PostgreSQL, object storage, and network.
          There is no shared multi-tenant datastore.
        </Card>
        <Card icon={HardDrive} title="What the Management Center stores">
          Customer registry, licenses, orders, DR bootstrap tokens, portal accounts. Never PG or
          SMTP passwords, AI keys, MinIO credentials, or operational content.
        </Card>
        <Card icon={ShieldCheck} title="No callback channel">
          Communication is install → Management Center only. The vendor has no way to access an
          install; recovery is customer-initiated with cryptographic primitives (break-glass or
          Bootstrap Recovery Token).
        </Card>
      </section>
      <p className="mt-10 text-sm text-muted-foreground">
        See also{" "}
        <Link to="/trust/licensing" className="text-primary hover:underline">
          licensing
        </Link>{" "}
        and{" "}
        <Link to="/trust/disaster-recovery" className="text-primary hover:underline">
          disaster recovery
        </Link>
        .
      </p>
    </main>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ServerCog;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
      <Icon className="h-6 w-6 text-primary" />
      <h2 className="mt-3 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
