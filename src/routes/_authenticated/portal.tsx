import { createFileRoute, Outlet, Link, useRouterState, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Download, FileText, MessagesSquare, Package, Home, BookOpen, Shield, Newspaper, LogOut } from "lucide-react";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

// Customer Portal — cloud-only surface for designated customer contacts:
// download installers, retrieve activation bundles, read release notes,
// open support tickets. Not part of the Self-Hosted Windows product.
export const Route = createFileRoute("/_authenticated/portal")({
  beforeLoad: () => {
    if (getClientDeploymentMode() === "selfhost") {
      throw redirect({ to: "/app" });
    }
  },
  component: PortalLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  staffOnly?: boolean;
  customerOnly?: boolean;
};

const NAV: readonly NavItem[] = [
  { to: "/portal", label: "Overview", icon: Home, exact: true, customerOnly: true },
  { to: "/portal/news", label: "News", icon: Newspaper, customerOnly: true },
  { to: "/portal/downloads", label: "Downloads", icon: Download, customerOnly: true },
  { to: "/portal/subscription", label: "Subscription", icon: FileText, customerOnly: true },
  { to: "/portal/support", label: "Support", icon: MessagesSquare, customerOnly: true },
  { to: "/portal/release-notes", label: "Release notes", icon: Package, customerOnly: true },
  { to: "/portal/documentation", label: "Documentation", icon: BookOpen },
  { to: "/portal/admin", label: "Admin", icon: Shield, staffOnly: true },
];

function PortalLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isPlatformAdmin, signOut, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const visible = NAV.filter((item) => {
    if (item.staffOnly) return isPlatformAdmin;
    if (item.customerOnly) return !isPlatformAdmin;
    return true;
  });
  useEffect(() => {
    if (!isPlatformAdmin) return;
    const allowed = visible.some((item) =>
      item.exact ? path === item.to : path.startsWith(item.to),
    );
    if (!allowed) navigate({ to: "/portal/admin", replace: true });
  }, [isPlatformAdmin, path, visible, navigate]);
  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="flex-1 flex bg-background">
      <aside className="w-60 border-r border-border bg-surface-1 flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
          <div className="h-8 w-8 rounded-lg bg-[var(--gold-soft)] border border-[var(--gold-line)] flex items-center justify-center">
            <LifeBuoy className="h-4 w-4 text-[color:var(--gold)]" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-semibold text-sm leading-tight">Customer Portal</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">OPSQAI</div>
          </div>
        </div>
        <nav className="p-3 space-y-0.5 flex-1">
          {visible.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${active ? "text-foreground font-medium" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"}`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[color:var(--gold)]"
                  />
                )}
                <Icon className={`h-4 w-4 ${active ? "text-[color:var(--gold)]" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          {user?.email && (
            <div className="px-2 text-xs text-muted-foreground truncate" title={user.email}>
              {user.email}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
