import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  HelpCircle,
  Users,
  LogOut,
  Menu,
  X,
  Languages,
  UserCircle,
  Building2,
  LineChart,
  GraduationCap,
  LifeBuoy,
  Package,
  Download,
  ClipboardCheck,
} from "lucide-react";
import { GlobalSearch } from "@/components/app/global-search";
import { useAuth } from "@/lib/auth-context";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogoMark } from "@/components/brand/logo";
import { NotificationsBell } from "@/components/app/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { SubscriptionStatusBanner } from "@/components/app/subscription-status-banner";
import { StaffPreviewBanner } from "@/components/app/staff-preview-banner";
import { useLicense, hasModule } from "@/lib/license";
import type { ModuleKey } from "@/lib/license-modules";
// SupportWidget is mounted globally in __root.tsx so it appears on marketing
// pages too. Do not remount here or the bubble/badge will duplicate.

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { signOut, user, companyName, hasPermission, hasAnyPermission } = auth;
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const license = useLicense();
  const gate = (m: ModuleKey | null) => (m === null ? true : hasModule(license, m));
  const [mobileOpen, setMobileOpen] = useState(false);

  const mode = getClientDeploymentMode();

  type NavItem = {
    to: string;
    label: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
    show: boolean;
    module?: ModuleKey | null;
  };

  // ── Self-hosted v2.0 nav — the ten canonical surfaces ─────────────────
  // /app/* is the Windows on-premise, single-tenant product for the end
  // customer. Ten flat items — no admin/platform sub-groups. Platform
  // operators run separately on the Management Center (/management/*).
  const workspace: NavItem[] = [
    { to: "/app", label: "AI Chat", icon: MessageSquare, exact: true, show: true, module: "chat" },
    {
      to: "/app/knowledge",
      label: "Knowledge",
      icon: BookOpen,
      show: hasAnyPermission("sop.read", "knowledge.manage", "sop.edit"),
      module: "kb",
    },
    {
      to: "/app/faq",
      label: "FAQ",
      icon: HelpCircle,
      show: hasAnyPermission("faq.read", "faq.edit"),
      module: "faq",
    },
    {
      to: "/app/academy",
      label: "Academy",
      icon: GraduationCap,
      show: hasPermission("academy.learn"),
      module: "academy",
    },
    {
      to: "/app/audit",
      label: "AI Audit",
      icon: LineChart,
      show: hasPermission("ai_audit.run"),
      module: null,
    },
    {
      to: "/app/users",
      label: "Users",
      icon: Users,
      show: hasAnyPermission("user.create", "user.update", "user.delete"),
      module: null,
    },
    { to: "/app/organization", label: "Organization", icon: Building2, show: true, module: null },
    { to: "/app/subscription", label: "Subscription", icon: Package, show: true, module: null },
    { to: "/app/updates", label: "Updates", icon: Download, show: true, module: null },
    { to: "/app/modules", label: "Modules", icon: ClipboardCheck, show: true, module: null },
  ];

  const filterNav = (items: NavItem[]) => items.filter((i) => i.show && gate(i.module ?? null));

  const sections: Array<{ label: string; items: NavItem[] }> = [
    { label: "Workspace", items: filterNav(workspace) },
  ];

  // Legacy flat `nav` kept for the mobile bottom-tab bar — primary items only.
  const nav = sections[0]?.items ?? [];

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      setMobileOpen(false);
      navigate({ to: "/auth", replace: true });
    }
  };

  const handleProfile = () => {
    setMobileOpen(false);
    navigate({ to: "/app/organization" });
  };


  const linkCls =
    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground";

  const ActiveIndicator = () => (
    <span
      aria-hidden
      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-sidebar-primary opacity-0 group-data-[status=active]:opacity-100 shadow-[0_0_12px_var(--color-sidebar-primary)]"
    />
  );

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div
      className="flex h-full flex-col text-sidebar-foreground"
      style={{ background: "var(--gradient-sidebar)" }}
    >
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <LogoMark size={32} className="text-sidebar-foreground" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold tracking-tight truncate">{t("appName")}</div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/55 truncate">
            {companyName ?? t("tagline")}
          </div>
        </div>
        <ThemeToggle className="h-8 w-8" />
        <NotificationsBell />
      </div>
      <div className="px-3 pt-3">
        <GlobalSearch asButton />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {sections.map((section, sIdx) =>
          section.items.length > 0 ? (
            <div key={section.label}>
              <div
                className={`${sIdx === 0 ? "" : "pt-5"} pb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40`}
              >
                {section.label}
              </div>
              {section.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  activeOptions={item.exact ? { exact: true } : undefined}
                  className={linkCls}
                >
                  <ActiveIndicator />
                  <item.icon className="h-4 w-4 shrink-0 text-sidebar-foreground/60 group-data-[status=active]:text-sidebar-primary transition-colors" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          ) : null,
        )}
        <div className="pt-5 pb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Deployment
        </div>
        <div className="px-3 py-1 text-[10px] text-sidebar-foreground/50">
          Mode: <span className="font-mono uppercase">{mode}</span>
        </div>
      </nav>
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Languages className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
          <Select value={lang} onValueChange={(v) => setLang(v as "de" | "en")}>
            <SelectTrigger
              aria-label="Language"
              className="h-8 flex-1 bg-sidebar-accent/40 border-sidebar-border text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-sidebar-accent/30">
          <span className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-sidebar-primary/40 to-sidebar-primary/10 border border-sidebar-primary/30 grid place-items-center text-sidebar-primary text-[11px] font-semibold uppercase">
            {user?.email?.slice(0, 2) ?? "OP"}
          </span>
          <span className="truncate flex-1 text-left text-[12px] text-sidebar-foreground/85">
            {user?.email}
          </span>
        </div>

        <button
          type="button"
          onClick={handleProfile}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-sidebar-foreground/85 hover:bg-sidebar-accent transition-colors"
        >
          <UserCircle className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
          <span>{t("myProfile")}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            if (typeof window !== "undefined")
              window.dispatchEvent(new CustomEvent("opsqai:open-support"));
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-sidebar-foreground/85 hover:bg-sidebar-accent transition-colors"
        >
          <LifeBuoy className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
          <span>Support &amp; Tickets</span>
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{t("signOut")}</span>
        </button>
      </div>
    </div>
  );

  // Primary tabs shown in the mobile bottom bar (up to 4 highest-priority items + "More")
  const bottomTabs = nav.slice(0, 4);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 shrink-0 border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile top bar — safe-area aware, sticky, app-like */}
      <div
        className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between bg-sidebar/95 backdrop-blur text-sidebar-foreground px-3 border-b border-sidebar-border"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          height: "calc(3.5rem + env(safe-area-inset-top))",
        }}
      >
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground -ml-1"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[85vw] max-w-sm border-0">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 min-w-0">
          <LogoMark size={22} className="text-sidebar-foreground shrink-0" />
          <span className="font-semibold tracking-tight text-sm truncate">{t("appName")}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <ThemeToggle className="h-9 w-9" />
          <NotificationsBell />
        </div>
      </div>

      <main
        className="flex-1 min-w-0 flex flex-col md:pt-0"
        style={{
          paddingTop: "calc(3.5rem + env(safe-area-inset-top))",
          paddingBottom: "calc(4rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="md:contents">
          <StaffPreviewBanner />
          <SubscriptionStatusBanner />
          
          
        </div>
        {children}
      </main>

      {/* Mobile bottom tab bar — app-like primary navigation */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar/95 backdrop-blur border-t border-sidebar-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5 h-16">
          {bottomTabs.map((item) => (
            <li key={item.to} className="flex">
              <Link
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="group flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-sidebar-foreground/60 data-[status=active]:text-sidebar-primary transition-colors"
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate max-w-[64px]">{item.label}</span>
              </Link>
            </li>
          ))}
          <li className="flex">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="More"
              className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-sidebar-foreground/60 active:text-sidebar-primary transition-colors"
            >
              <Menu className="h-5 w-5" />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* SupportWidget is mounted globally in __root.tsx */}
    </div>
  );
}
