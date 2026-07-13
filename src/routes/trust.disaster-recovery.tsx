import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { LifeBuoy, KeySquare, Database } from "lucide-react";

export const Route = createFileRoute("/trust/disaster-recovery")({
  head: () =>
    pageHead({
      title: "Disaster Recovery — Trust — OPSQAI",
      description:
        "Seven canonical DR scenarios, two independent recovery paths (offline break-glass and Management-Center-issued Bootstrap Recovery Token), customer-owned backups.",
      path: "/trust/disaster-recovery",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Trust", path: "/trust" },
        { name: "Disaster Recovery", path: "/trust/disaster-recovery" },
      ],
    }),
  component: DrTrust,
});

function DrTrust() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">Trust</p>
      <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
        Recovery is customer-initiated, cryptographically verified, drilled every release.
      </h1>
      <p className="mt-4 text-muted-foreground">
        This page is maintained by OPSQAI. Recovery relies on customer-held backups and one of two
        recovery paths — neither of which lets the vendor access the install unassisted.
      </p>
      <section className="mt-10 space-y-6">
        <Card icon={Database} title="Customer-owned backups">
          Customer runs PostgreSQL and object-storage backups against their own infrastructure.
          OPSQAI ships reference tooling and a <code>opsqai doctor --verify-backup</code> command;
          the customer performs monthly restore drills.
        </Card>
        <Card icon={KeySquare} title="Two independent recovery paths">
          Offline: a scrypt-hashed break-glass secret generated ahead of time and stored securely by
          the customer. Online: a Bootstrap Recovery Token issued by the Management Center after
          out-of-band verification, Ed25519-signed and <code>install_id</code>-bound with a short
          TTL.
        </Card>
        <Card icon={LifeBuoy} title="Seven canonical scenarios">
          Full DB loss, lost admin, expired license offline, erroneous revocation, storage loss,
          install-id drift after restore, emergency signing-key rotation. Every one is rehearsed in
          the DR-Verify runbook before each release.
        </Card>
      </section>
      <p className="mt-10 text-sm text-muted-foreground">
        Full detail in the{" "}
        <Link to="/docs" className="text-primary hover:underline">
          Security Documentation
        </Link>
        , chapter 12.
      </p>
    </main>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof LifeBuoy;
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
