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
                      "oq-pill flex items-center gap-3 px-3 py-2.5 text-sm",
                      active
                        ? "bg-[color:var(--gold)] font-semibold text-[color:var(--gold-foreground)] shadow-[0_10px_24px_-14px_color-mix(in_oklab,var(--gold)_80%,transparent)]"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="rounded-2xl border border-border bg-secondary/60 p-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--gold-soft)] text-[color:var(--gold)]">
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
          className="mt-2 w-full justify-start rounded-xl text-muted-foreground hover:text-foreground"
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
    <div className="oq-soft flex min-h-dvh w-full gap-4 p-0 md:p-4">
      <div className="hidden md:block">{Sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 p-3">{Sidebar}</div>
        </div>
      )}

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col gap-4 md:min-h-0">
        <header className="oq-soft-card flex h-14 items-center gap-3 px-3 md:h-16 md:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <label className="hidden min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-secondary/60 px-3 py-2 sm:flex">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search companies, licenses, installations…"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </label>
          <div className="ml-auto flex items-center gap-1">
            <NotificationsBell />
            <ThemeToggle />
          </div>
        </header>
        <main className="oq-soft-card min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
