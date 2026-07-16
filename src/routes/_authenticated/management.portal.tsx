import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/management/portal")({
  beforeLoad: () => {
    throw redirect({ to: "/management/releases" });
  },
});
