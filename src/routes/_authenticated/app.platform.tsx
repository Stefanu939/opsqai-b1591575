import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PlatformSidebar } from "@/components/platform/AppSidebar";
import { PlatformTopbar } from "@/components/platform/PlatformTopbar";
import { RecentModulesBar } from "@/components/platform/RecentModulesBar";

export const Route = createFileRoute("/_authenticated/app/platform")({
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
  component: PlatformLayout,
});

function PlatformLayout() {
  return (
    <div className="mc-shell min-h-screen w-full">
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-full bg-[var(--mc-bg)]">
          <PlatformSidebar />
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <PlatformTopbar />
            <main className="mc-grid-faint flex-1 overflow-x-hidden">
              <Outlet />
            </main>
            <RecentModulesBar />
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
