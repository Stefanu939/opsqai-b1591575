import { createFileRoute, redirect } from "@tanstack/react-router";

// Companies has been merged into Customers. Keep the URL working by
// redirecting to the unified page.
export const Route = createFileRoute("/_authenticated/management/companies")({
  beforeLoad: () => {
    throw redirect({ to: "/management/customers" });
  },
});
