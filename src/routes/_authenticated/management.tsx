import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ManagementShell } from "@/components/mc/mc-shell";

export const Route = createFileRoute("/_authenticated/management")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const ok = (roles ?? []).some(
      (r) => r.role === "platform_admin" || r.role === "platform_owner",
    );
    if (!ok) throw redirect({ to: "/app" });
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
