import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { getBrowserAuthProvider } from "@/lib/providers/registry";
import { AppShell } from "@/components/app/app-shell";
import { getClientDeploymentMode } from "@/lib/deployment-mode";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await getBrowserAuthProvider().getUser();
    if (!user) {
      if (getClientDeploymentMode() === "selfhost") {
        throw redirect({
          to: "/auth",
          search: { audience: "company", next: location.href || "/app" },
        });
      }
      throw redirect({ to: "/auth" });
    }
    return { user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  // /management/* and /portal/* provide their own shells (ManagementShell,
  // PortalLayout). Wrapping them in AppShell would render two sidebars.
  //
  // This must be decided from the COMMITTED matches, not `location.pathname`:
  // during a pending navigation (e.g. sign-out → /auth) the location updates
  // first while the old route is still mounted, which briefly wrapped the
  // Management Center / Portal sidebar inside the AppShell sidebar.
  const bare = useRouterState({
    select: (s) =>
      s.matches.some(
        (m) =>
          m.routeId.startsWith("/_authenticated/management") ||
          m.routeId.startsWith("/_authenticated/portal"),
      ),
  });
  if (bare) return <Outlet />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
