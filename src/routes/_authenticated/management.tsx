import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ManagementShell } from "@/components/mc/mc-shell";
import { getClientDeploymentMode } from "@/lib/deployment-mode";

// Management Center — cloud-only, OPSQAI staff only. It never ships inside
// the customer's Windows installation.
export const Route = createFileRoute("/_authenticated/management")({
  beforeLoad: async () => {
    if (getClientDeploymentMode() === "selfhost") {
      throw redirect({ to: "/app" });
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const ok = (roles ?? []).some(
      (r) => r.role === "platform_admin" || r.role === "platform_owner",
    );
    if (!ok) throw redirect({ to: "/portal" });
  },
  component: ManagementLayout,
});

function ManagementLayout() {
  return (
    <ManagementShell>
      <Outlet />
    </ManagementShell>
  );
}
