import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { getBrowserAuthProvider } from "@/lib/providers/registry";
import { AppShell } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getBrowserAuthProvider().getUser();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  // /management/* and /portal/* provide their own shells (ManagementShell,
  // PortalLayout). Wrapping them in AppShell would render two sidebars.
  const bare = path.startsWith("/management") || path.startsWith("/portal");
  if (bare) return <Outlet />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

