import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/admin/installations")({
  head: () => ({ meta: [{ title: "Installations — Mission Control" }] }),
  component: () => (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Installations</h1>
      <p className="text-sm text-muted-foreground">
        Registered customer installs (install_id, heartbeat, installer version). See Companies
        for the corresponding tenant record.
      </p>
      <Link
        to="/app/admin/companies"
        className="inline-block text-sm underline underline-offset-4"
      >
        Open Companies →
      </Link>
    </div>
  ),
});
