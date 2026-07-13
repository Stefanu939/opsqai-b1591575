import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/admin/monitoring")({
  head: () => ({ meta: [{ title: "Monitoring — Mission Control" }] }),
  component: () => (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Monitoring</h1>
      <p className="text-sm text-muted-foreground">
        Fleet health, heartbeat status and installation drift. Detailed diagnostics live in the
        platform Doctor page.
      </p>
      <Link
        to="/app/platform/doctor"
        className="inline-block text-sm underline underline-offset-4"
      >
        Open System Doctor →
      </Link>
    </div>
  ),
});
