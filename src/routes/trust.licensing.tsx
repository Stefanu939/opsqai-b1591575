import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { KeyRound, ShieldCheck, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/trust/licensing")({
  head: () =>
    pageHead({
      title: "Licensing — Trust — OPSQAI",
      description:
        "OPSQAI uses Ed25519-signed, versioned licenses. Two axes: Installation and per-Module. Offline activation, key rotation with dual-signing overlap, revocation via signed CRL.",
      path: "/trust/licensing",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Trust", path: "/trust" },
        { name: "Licensing", path: "/trust/licensing" },
      ],
    }),
  component: LicensingTrust,
});

function LicensingTrust() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">Trust</p>
      <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
        Boring, verifiable cryptography.
      </h1>
      <p className="mt-4 text-muted-foreground">
        This page is maintained by OPSQAI. It describes enabled controls; it is not a certification.
      </p>
      <section className="mt-10 space-y-6">
        <Card icon={KeyRound} title="Ed25519, versioned, key-id bound">
          Every license is a signed token carrying <code>license_version</code>, <code>kind</code>,
          <code> install_id</code> and <code>key_id</code>. The verifier rejects unknown versions
          or unknown key ids. Private signing keys never leave the Management Center.
        </Card>
        <Card icon={ShieldCheck} title="Two independent axes">
          One mandatory Installation License per install (seats + maintenance). Zero or more
          per-Module Licenses. No tier bundling.
        </Card>
        <Card icon={RefreshCw} title="Rotation and revocation">
          Signing keys rotate on a documented cadence with at least 90 days of dual-signing
          overlap. Revocation is delivered via a signed CRL, itself included in every activation
          bundle for offline installs.
        </Card>
      </section>
      <p className="mt-10 text-sm text-muted-foreground">
        Details in the{" "}
        <Link to="/docs" className="text-primary hover:underline">
          Security Documentation
        </Link>
        , chapter 5.
      </p>
    </main>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof KeyRound;
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
