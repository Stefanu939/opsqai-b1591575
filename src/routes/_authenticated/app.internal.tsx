import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { InternalSubnav } from "@/components/app/internal-subnav";

export const Route = createFileRoute("/_authenticated/app/internal")({
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
  component: () => (
    <div className="flex flex-col flex-1">
      <InternalSubnav />
      <Outlet />
    </div>
  ),
});
