import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getClientDeploymentMode } from "@/lib/deployment-mode";

// The OPSQAI application (`/app/*`) is the Self-Hosted Windows product.
// It runs INSIDE the customer's infrastructure. On the cloud deployment
// (`OPSQAI_MODE=mc`, opsqai.de), no company end user should ever reach it —
// they authenticate only into their local Windows installation. Redirect
// any cloud visitor who lands here to a public explainer.
export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: () => {
    if (getClientDeploymentMode() === "mc") {
      throw redirect({ to: "/windows-only" });
    }
  },
  component: () => <Outlet />,
});
