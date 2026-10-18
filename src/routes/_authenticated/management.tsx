import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCloudAccess } from "@/lib/cloud-access.functions";
import { isKaiAudience } from "@/lib/cloud-access";
import { ManagementShell } from "@/components/mc/mc-shell";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { RouteErrorState } from "@/components/app/route-error-state";

// Management Center — cloud-only, OPSQAI staff only. It never ships inside
// the customer's Windows installation.
export const Route = createFileRoute("/_authenticated/management")({
  beforeLoad: async () => {
    if (getClientDeploymentMode() === "selfhost") {
      throw redirect({ to: "/app" });
    }
    if (isKaiAudience()) throw redirect({ to: "/kai" });
    const access = await getCloudAccess();
    if (!access.isStaff) throw redirect({ to: access.isCustomer ? "/portal" : "/kai" });
  },
  component: ManagementLayout,
  errorComponent: ({ error }) => <RouteErrorState error={error} homeTo="/management" />,
});

function ManagementLayout() {
  return (
    <ManagementShell>
      <Outlet />
    </ManagementShell>
  );
}
