import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
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

