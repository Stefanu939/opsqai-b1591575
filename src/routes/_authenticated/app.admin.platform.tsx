import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy tiles landing page — replaced by the Mission Control sidebar.
// Kept only as a redirect so old bookmarks still work.
export const Route = createFileRoute("/_authenticated/app/admin/platform")({
  beforeLoad: () => {
    throw redirect({ to: "/app/platform/overview" });
  },
  component: () => null,
});
