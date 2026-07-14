import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/admin/release-management")({
  head: () => ({ meta: [{ title: "Release Management — Mission Control" }] }),
  component: () => (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Release Management</h1>
      <p className="text-sm text-muted-foreground">
        Installer builds, signing, and rollout channels. Currently managed under Platform →
        Licenses & Releases.
      </p>
      <Link
        to="/app/platform/licenses" search={{ tab: "licenses" as const }}
        className="inline-block text-sm underline underline-offset-4"
      >
        Open Licenses & Releases →
      </Link>
    </div>
  ),
});
