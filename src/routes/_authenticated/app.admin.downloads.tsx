import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/admin/downloads")({
  head: () => ({ meta: [{ title: "Downloads — Mission Control" }] }),
  component: () => (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Downloads</h1>
      <p className="text-sm text-muted-foreground">
        Installer releases and activation packages served to customers. Managed under Licenses
        → Releases.
      </p>
      <Link
        to="/app/platform/licenses"
        className="inline-block text-sm underline underline-offset-4"
      >
        Open Releases →
      </Link>
    </div>
  ),
});
