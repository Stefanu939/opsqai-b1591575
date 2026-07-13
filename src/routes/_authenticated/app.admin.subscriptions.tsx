import { createFileRoute, redirect } from "@tanstack/react-router";

// Consolidated into /app/platform/licenses (Billing tab) under Mission Control.
export const Route = createFileRoute("/_authenticated/app/admin/subscriptions")({
  beforeLoad: () => {
    throw redirect({ to: "/app/platform/licenses", search: { tab: "billing" } as never });
  },
  component: () => null,
});
