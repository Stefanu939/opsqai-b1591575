import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { RouteErrorState } from "@/components/app/route-error-state";

// The OPSQAI application (`/app/*`) is the Self-Hosted Windows product.
// It runs INSIDE the customer's infrastructure. On the cloud / Management
// Center deployment (`OPSQAI_MODE=mc`, opsqai.de) NOBODY reaches it — not
// customers, not OPSQAI staff. There is no staff preview and no demo tenant:
// the Self-Hosted product is only ever exercised on a real installation.
export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: async ({ location }) => {
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

    // Tenant safety lock: this installation's data belongs to one company. If
    // the licence on disk belongs to a different one (data folder copied to
    // another machine, or a foreign licence dropped in), nobody sees data —
    // only the licence screen.
    if (!location.pathname.startsWith("/app/platform/license")) {
      try {
        const { getInstallationLockState } = await import("@/lib/installation-identity.functions");
        const state = await getInstallationLockState();
        if (state.locked) {
          throw redirect({ to: "/app/platform/license-activation" });
        }
      } catch (error) {
        if (error && typeof error === "object" && "to" in error) throw error;
        // A failed check must never lock the operator out of their own install.
      }
    }
  },

  component: () => <Outlet />,
  errorComponent: ({ error }) => <RouteErrorState error={error} homeTo="/app" />,
});
