import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/admin/contacts")({
  head: () => ({ meta: [{ title: "Contacts — Mission Control" }] }),
  component: () => (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
      <p className="text-sm text-muted-foreground">
        Named commercial and technical contacts per customer. Managed on the customer profile.
      </p>
      <Link
        to="/app/admin/customers"
        className="inline-block text-sm underline underline-offset-4"
      >
        Open Enterprise Documents →
      </Link>
    </div>
  ),
});
