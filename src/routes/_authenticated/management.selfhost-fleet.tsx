import { createFileRoute, redirect } from "@tanstack/react-router";

// Self-Hosted Fleet was merged into Installations — one module, one source of truth.
export const Route = createFileRoute("/_authenticated/management/selfhost-fleet")({
  beforeLoad: () => {
    throw redirect({ to: "/management/installations" });
  },
});
