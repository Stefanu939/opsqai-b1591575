import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/platform/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/platform/overview" });
  },
});
