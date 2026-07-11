import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { LifeBuoy, Download, FileText, Ticket, Package, Home } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal")({
  component: PortalLayout,
});

const NAV = [
  { to: "/portal", label: "Overview", icon: Home, exact: true },
  { to: "/portal/downloads", label: "Downloads", icon: Download },
  { to: "/portal/contract", label: "Contract", icon: FileText },
  { to: "/portal/release-notes", label: "Release notes", icon: Package },
  { to: "/portal/tickets", label: "Tickets", icon: Ticket },
] as const;

function PortalLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex-1 flex">
      <aside className="w-56 border-r bg-muted/30 p-4 space-y-1 shrink-0">
        <div className="flex items-center gap-2 mb-4 px-2">
          <LifeBuoy className="h-5 w-5" />
          <span className="font-medium">Customer Portal</span>
        </div>
        {NAV.map((item) => {
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}
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
