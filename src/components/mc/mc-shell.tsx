import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  KeyRound,
  Radio,
  Rocket,
  Inbox,
  Crown,
  ScrollText,
  Settings,
  Menu,
  X,
  LogOut,
  Search,
  ShieldCheck,
  CalendarDays,

} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";
import { NotificationsBell } from "@/components/app/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "Overview",
    items: [
      { to: "/management", label: "Overview", icon: LayoutDashboard, exact: true },
      { to: "/management/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },

  {
    title: "Customers",
    items: [
      { to: "/management/customers", label: "Customers", icon: Users },
      { to: "/management/installations", label: "Installations", icon: Radio },
      { to: "/management/licenses", label: "Licenses", icon: KeyRound },
    ],
  },
  {
    title: "Product",
    items: [{ to: "/management/releases", label: "Releases", icon: Rocket }],
  },
  {
    title: "OPSQAI",
    items: [{ to: "/management/team", label: "Team", icon: Users }],
  },
  {
    title: "Operations",
    items: [
      { to: "/management/support", label: "Support", icon: Inbox },
      { to: "/management/ownership", label: "Ownership", icon: Crown },
      { to: "/management/audit-logs", label: "Audit Logs", icon: ScrollText },
      { to: "/management/settings", label: "Settings", icon: Settings },
    ],
  },
  // NOTE: the Management Center intentionally exposes NO Self-Hosted product
  // surface. `/app/*` is the customer's Windows installation only; it is not
  // demoed, previewed or QA'd from here.
];

export function ManagementShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: Item) =>
    item.exact ? currentPath === item.to : currentPath.startsWith(item.to);

  const Sidebar = (
    <aside className="oq-soft-card flex h-full w-[248px] flex-col overflow-hidden p-3">
      <div className="flex items-center gap-2.5 px-2 py-3">
        <LogoMark className="h-7 w-7" />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="font-display text-base font-semibold tracking-tight text-foreground">
            OPSQAI
          </span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Management Center
          </span>
        </div>
      </div>

      <nav className="mt-1 flex-1 space-y-4 overflow-y-auto pb-2">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                       "oq-pill flex items-center gap-3 px-2.5 py-2 text-sm",
                      active
                         ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                         "grid h-8 w-8 shrink-0 place-items-center rounded-md border",
                        active
                           ? "border-primary/25 bg-primary/10 text-primary"
                          : "border-border bg-secondary/70",
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

       <div className="rounded-md border border-border bg-secondary/60 p-3">
        <div className="flex items-center gap-2.5">
           <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-foreground">Platform staff</div>
            <div className="truncate text-[11px] text-muted-foreground">{user?.email}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
           className="mt-2 w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={async () => {
            await signOut();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );

  return (
     <div className="oq-product oq-management-shell oq-soft flex min-h-dvh w-full gap-0">
      <div className="hidden md:block">{Sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
           <div className="relative z-50">{Sidebar}</div>
        </div>
      )}

       <div className="flex min-h-dvh min-w-0 flex-1 flex-col md:min-h-0">
        <header className="oq-soft-card flex h-14 items-center gap-3 px-3 md:h-16 md:px-4">
          <Button
            variant="ghost"
            size="icon"
             className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
           <label className="hidden min-w-0 max-w-xl flex-1 items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 sm:flex">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search companies, licenses, installations…"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </label>
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationsBell />
            <ThemeToggle />
             <span className="ml-1 flex items-center gap-2 rounded-md border border-border bg-secondary/60 py-1 pl-1 pr-2.5">
               <span className="grid h-8 w-8 place-items-center rounded-sm bg-primary text-[11px] font-semibold text-primary-foreground">
                {(user?.email?.split("@")[0]?.slice(0, 2) ?? "OQ").toUpperCase()}
              </span>
              <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                <span className="truncate text-xs font-semibold text-foreground">
                  {user?.email?.split("@")[0] ?? "Account"}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">Platform staff</span>
              </span>
            </span>
          </div>
        </header>
        <main className="oq-soft-card min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
