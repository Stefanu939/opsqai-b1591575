import {
  createFileRoute,
  Outlet,
  Link,
  useRouterState,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Headphones,
  Download,
  FileText,
  MessagesSquare,
  Package,
  Home,
  BookOpen,
  Shield,
  Newspaper,
  LogOut,
  Menu,
  X,
  CalendarDays,
  Search,
  ChevronDown,
} from "lucide-react";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { LogoMark } from "@/components/brand/logo";
import { NotificationsBell } from "@/components/app/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { RouteErrorState } from "@/components/app/route-error-state";

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
  errorComponent: ({ error }) => <RouteErrorState error={error} homeTo="/portal" />,
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
  { to: "/portal/calendar", label: "Calendar", icon: CalendarDays, customerOnly: true },
  { to: "/portal/news", label: "News", icon: Newspaper, customerOnly: true },

  { to: "/portal/downloads", label: "Downloads", icon: Download, customerOnly: true },
  { to: "/portal/subscription", label: "Subscription", icon: FileText, customerOnly: true },
  { to: "/portal/support", label: "Support", icon: MessagesSquare, customerOnly: true },
  { to: "/portal/release-notes", label: "Release notes", icon: Package, customerOnly: true },
  { to: "/portal/documentation", label: "Documentation", icon: BookOpen },
  { to: "/portal/admin", label: "Admin", icon: Shield, staffOnly: true },
];

function initials(email: string | null | undefined) {
  const local = email?.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const raw = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
  return (raw || "OQ").toUpperCase();
}

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
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (!isPlatformAdmin) return;
    const allowed = visible.some((item) =>
      item.exact ? path === item.to : path.startsWith(item.to),
    );
    if (!allowed) navigate({ to: "/portal/admin", replace: true });
  }, [isPlatformAdmin, path, visible, navigate]);
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);
  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };
  const SidebarInner = (
    <>
      <div className="flex items-center gap-2.5 px-2 py-4">
        <LogoMark className="h-8 w-8" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-display text-lg font-semibold tracking-tight text-foreground">
            OPSQAI
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--gold)]">
            Customer Portal
          </div>
        </div>
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
           className="md:hidden flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="mt-1 flex-1 space-y-1.5 overflow-y-auto pb-2">
        {visible.map((item) => {
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`oq-pill flex items-center gap-3 px-2.5 py-2 text-sm ${
                active
                   ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <span
                aria-hidden
                 className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border ${
                  active
                     ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-border bg-secondary/70"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
       <div className="rounded-md border border-border bg-secondary/60 p-3">
        <div className="flex items-start gap-2.5">
          <IconTile icon={Headphones} size="md" round />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground">Need help?</div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Our support team is here for you.
            </p>
          </div>
        </div>
         <Button asChild variant="outline" size="sm" className="mt-3 w-full">
          <Link to="/portal/support">Contact support</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
           className="mt-1 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  );
  return (
     <div className="oq-product oq-portal-shell oq-soft flex flex-1 gap-0">
      <aside className="oq-soft-card hidden md:flex w-[248px] flex-col shrink-0 p-3 md:sticky md:top-0 md:h-dvh md:overflow-hidden">
        {SidebarInner}
      </aside>
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
           <aside className="oq-soft-card md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col p-3">
            {SidebarInner}
          </aside>
        </>
      )}
       <main className="flex min-w-0 flex-1 flex-col">
        <div className="oq-soft-card sticky top-0 z-30 flex h-14 items-center gap-2 px-3 md:h-16 md:px-4">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
             className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
           <label className="hidden min-w-0 max-w-xl flex-1 items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 sm:flex">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search documentation, downloads, tickets…"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </label>
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationsBell />
            <ThemeToggle />
             <span className="ml-1 flex items-center gap-2 rounded-md border border-border bg-secondary/60 py-1 pl-1 pr-2.5">
               <span className="grid h-8 w-8 place-items-center rounded-sm bg-primary text-[11px] font-semibold text-primary-foreground">
                {initials(user?.email)}
              </span>
              <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                <span className="truncate text-xs font-semibold text-foreground">
                  {user?.email?.split("@")[0] ?? "Account"}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {user?.email?.split("@")[1] ?? "OPSQAI"}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          </div>
        </div>
        <div className="oq-soft-card min-w-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
