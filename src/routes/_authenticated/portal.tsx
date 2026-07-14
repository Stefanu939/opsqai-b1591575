import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { LifeBuoy, Download, FileText, MessagesSquare, Package, Home, BookOpen } from "lucide-react";
import { getClientDeploymentMode } from "@/lib/deployment-mode";

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

const NAV = [
  { to: "/portal", label: "Overview", icon: Home, exact: true },
  { to: "/portal/downloads", label: "Downloads", icon: Download },
  { to: "/portal/subscription", label: "Subscription", icon: FileText },
  { to: "/portal/support", label: "Support", icon: MessagesSquare },
  { to: "/portal/release-notes", label: "Release notes", icon: Package },
  { to: "/portal/documentation", label: "Documentation", icon: BookOpen },
] as const;

function PortalLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex-1 flex bg-background">
      <aside className="w-60 border-r border-border bg-surface-1 p-4 space-y-1 shrink-0">
        <div className="flex items-center gap-2 mb-4 px-2">
          <LifeBuoy className="h-5 w-5" />
          <span className="font-display font-semibold">Customer Portal</span>
        </div>
        {NAV.map((item) => {
          const exact = (item as { exact?: boolean }).exact === true;
          const active = exact ? path === item.to : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${active ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
