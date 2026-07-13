import { createFileRoute, redirect } from "@tanstack/react-router";

// Consolidated into /app/platform/customers under the Mission Control shell.
export const Route = createFileRoute("/_authenticated/app/admin/companies")({
  beforeLoad: () => {
    throw redirect({ to: "/app/platform/customers" });
  },
  component: () => null,
});
