import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { RouteErrorState } from "@/components/app/route-error-state";

// The OPSQAI application (`/app/*`) is the Self-Hosted Windows product.
// It runs INSIDE the customer's infrastructure. On the cloud / Management
// Center deployment (`OPSQAI_MODE=mc`, opsqai.de) NOBODY reaches it — not
// customers, not OPSQAI staff. There is no staff preview and no demo tenant:
// the Self-Hosted product is only ever exercised on a real installation.
export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: async () => {
    if (getClientDeploymentMode() === "mc") {
      throw redirect({ to: "/windows-only" });
    }
    // Self-Hosted: a one-time / temporary password must be replaced before
    // the operator can use the platform. The claim comes from the signed
    // access token, so this cannot be bypassed by editing local storage —
    // the server also rejects the stale password on the next refresh.
    const { mustChangePassword } = await import("@/lib/must-change-password");
    if (await mustChangePassword()) {
      throw redirect({ to: "/reset-password", search: { forced: true } });
    }
  },

  component: () => <Outlet />,
  errorComponent: ({ error }) => <RouteErrorState error={error} homeTo="/app" />,
});
