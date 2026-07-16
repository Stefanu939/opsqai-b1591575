import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  KeyRound,
  Rocket,
  LifeBuoy,
  Inbox,
  Crown,
  ScrollText,
  Settings,
  Menu,
  X,
  LogOut,
  MessageSquare,
  BookOpen,
  HelpCircle,
  GraduationCap,
  LineChart,
  Download,
  ClipboardCheck,
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
    items: [{ to: "/management", label: "Overview", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Customers",
    items: [
      { to: "/management/customers", label: "Customers", icon: Users },
      { to: "/management/installations", label: "Installations", icon: Package },
      { to: "/management/licenses", label: "Licenses", icon: KeyRound },
    ],
  },
  {
    title: "Product",
    items: [
      { to: "/management/releases", label: "Releases", icon: Rocket },
    ],
  },
  {
    title: "OPSQAI",
    items: [
      { to: "/management/team", label: "Team", icon: Users },
    ],
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
  // DEMO — Self-Hosted product surfaced inside the Management Center for
  // OPSQAI staff. Pinned to the seeded demo tenant via StaffPreviewBanner;
  // all premium modules are unlocked because cloud mode is unlimited.
  {
    title: "Demo (Self-Hosted preview)",
    items: [
      { to: "/app", label: "AI Chat", icon: MessageSquare, exact: true },
      { to: "/app/knowledge", label: "Knowledge", icon: BookOpen },
      { to: "/app/faq", label: "FAQ", icon: HelpCircle },
      { to: "/app/academy", label: "Academy", icon: GraduationCap },
      { to: "/app/audit", label: "AI Audit", icon: LineChart },
      { to: "/app/users", label: "Users", icon: Users },
      { to: "/app/organization", label: "Organization", icon: Building2 },
      { to: "/app/subscription", label: "Subscription", icon: Package },
      { to: "/app/updates", label: "Updates", icon: Download },
      { to: "/app/modules", label: "Modules", icon: ClipboardCheck },
    ],
  },
];


export function ManagementShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: Item) =>
    item.exact ? currentPath === item.to : currentPath.startsWith(item.to);

  const Sidebar = (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <LogoMark className="h-6 w-6" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-foreground">OPSQAI</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Management
          </span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {SECTIONS.map((section, idx) => (
          <div key={section.title} className={idx === 0 ? "" : "mt-4"}>
            <div className="mx-2 mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "relative mx-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
                  )}
                  style={active ? { backgroundColor: "var(--surface-2)" } : undefined}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                      style={{ background: "var(--mc-gold, var(--gold))" }}
                    />
                  )}
                  <Icon
                    className={cn("h-4 w-4", active && "text-[color:var(--mc-gold,var(--gold))]")}
                    strokeWidth={1.75}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}

          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 truncate px-1 text-xs text-muted-foreground">
          {user?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
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
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <div className="hidden md:block">{Sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50">{Sidebar}</div>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <div className="text-sm font-medium text-foreground">Management Center</div>
          <div className="ml-auto flex items-center gap-1">
            <NotificationsBell />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
