import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/admin/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance — Mission Control" }] }),
  component: () => (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Maintenance</h1>
      <p className="text-sm text-muted-foreground">
        Recurring maintenance windows per customer (€200–€500 / month). Renewals and
        expirations are tracked on each license record.
      </p>
      <Link
        to="/app/platform/licenses" search={{ tab: "licenses" as const }}
        className="inline-block text-sm underline underline-offset-4"
      >
        Open Licenses →
      </Link>
    </div>
  ),
});
