import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { Newspaper, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBrowserAuthProvider } from "@/lib/providers/registry";

export const Route = createFileRoute("/_authenticated/portal/admin")({
  ssr: false,
  beforeLoad: async () => {
    const user = await getBrowserAuthProvider().getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["platform_owner", "platform_admin"]);
    if (!roles || roles.length === 0) {
      throw redirect({ to: "/portal" });
    }
  },
  component: AdminLayout,
});

const SUB_NAV: ReadonlyArray<{ to: string; label: string; icon: typeof Newspaper; exact?: boolean }> = [
  { to: "/portal/admin", label: "News", icon: Newspaper, exact: true },
  { to: "/portal/admin/downloads", label: "Downloads", icon: Package },
];

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <div className="mb-6 border-b border-border">
        <nav className="flex gap-1">
          {SUB_NAV.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
                  active
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
