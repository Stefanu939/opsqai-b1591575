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
  LifeBuoy,
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
} from "lucide-react";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center gap-2.5 px-2 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--gold-soft)] border border-[var(--gold-line)]">
          <LifeBuoy className="h-4 w-4 text-[color:var(--gold)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-semibold text-sm leading-tight">Customer Portal</div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">OPSQAI</div>
        </div>
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="md:hidden h-8 w-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="mt-1 flex-1 space-y-1 overflow-y-auto pb-2">
        {visible.map((item) => {
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`oq-pill flex items-center gap-3 px-3 py-2.5 text-sm ${
                active
                  ? "bg-[color:var(--gold)] font-semibold text-[color:var(--gold-foreground)] shadow-[0_10px_24px_-14px_color-mix(in_oklab,var(--gold)_80%,transparent)]"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="rounded-2xl border border-border bg-secondary/60 p-3">
        <div className="text-xs font-semibold text-foreground">Need help?</div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          Our support team is here for you.
        </p>
        {user?.email && (
          <div className="mt-2 truncate text-[11px] text-muted-foreground" title={user.email}>
            {user.email}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="mt-1 w-full justify-start gap-2 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  );
  return (
    <div className="oq-soft flex flex-1 gap-4 p-0 md:p-4">
      <aside className="oq-soft-card hidden md:flex w-[248px] flex-col shrink-0 p-3">
        {SidebarInner}
      </aside>
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="oq-soft-card md:hidden fixed inset-y-3 left-3 z-50 w-64 flex flex-col p-3">
            {SidebarInner}
          </aside>
        </>
      )}
      <main className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="md:hidden oq-soft-card sticky top-0 z-30 flex items-center gap-2 h-14 px-3">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-[var(--gold-soft)] border border-[var(--gold-line)] flex items-center justify-center">
              <LifeBuoy className="h-3.5 w-3.5 text-[color:var(--gold)]" />
            </div>
            <span className="text-sm font-medium">Customer Portal</span>
          </div>
        </div>
        <div className="oq-soft-card min-w-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

