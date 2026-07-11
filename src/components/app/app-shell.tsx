import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, MessageSquare, BookOpen, HelpCircle, Users, LogOut, Menu, X,
  Languages, BarChart3, ScrollText, UserCircle, ChevronDown, Building2, ShieldCheck, Inbox,
  AlertTriangle, LineChart, Sparkles, ClipboardCheck, GraduationCap, KeyRound, LifeBuoy,
  Package, FileText, Mail, Wrench, Rocket, ShieldAlert, Webhook,
} from "lucide-react";
import { GlobalSearch } from "@/components/app/global-search";
import { useAuth } from "@/lib/auth-context";
import { useDeploymentInfo } from "@/components/app/deployment-mode-gate";
import { getClientDeploymentMode } from "@/lib/deployment-mode";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoMark } from "@/components/brand/logo";
import { NotificationsBell } from "@/components/app/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceContextBanner } from "@/components/app/workspace-context-banner";
import { SubscriptionStatusBanner } from "@/components/app/subscription-status-banner";
import { useLicense, hasModule } from "@/lib/license";
import type { ModuleKey } from "@/lib/license-modules";
// SupportWidget is mounted globally in __root.tsx so it appears on marketing
// pages too. Do not remount here or the bubble/badge will duplicate.


export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { isPlatformAdmin, isPlatformOwner, signOut, user, companyName, activeCompanyId, setActiveCompanyId, hasPermission, hasAnyPermission } = auth;
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const license = useLicense();
  const gate = (m: ModuleKey | null) => (m === null ? true : hasModule(license, m));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; is_system?: boolean }>>([]);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    supabase.from("companies").select("id, name, is_system").order("is_system", { ascending: false }).order("name").then(({ data }) => {
      // Include OPSQAI Internal for platform admins so it is switchable from the sidebar.
      setCompanies((data ?? []) as Array<{ id: string; name: string; is_system?: boolean }>);
    });
  }, [isPlatformAdmin]);


  const nav = [
    { to: "/app", label: t("dashboard"), icon: LayoutDashboard, exact: true, show: true, module: null as ModuleKey | null },
    { to: "/app/chat", label: t("chat"), icon: MessageSquare, show: hasPermission("chat.use") || hasAnyPermission("sop.read", "knowledge.manage"), module: "chat" as ModuleKey },
    { to: "/app/workspace", label: t("workspace"), icon: Sparkles, show: hasPermission("workspace.use") || hasPermission("workspace.manage"), module: null as ModuleKey | null },
    { to: "/app/knowledge", label: t("knowledge"), icon: BookOpen, show: hasAnyPermission("sop.read", "knowledge.manage", "sop.edit"), module: "kb" as ModuleKey },
    { to: "/app/faq", label: t("faq"), icon: HelpCircle, show: hasAnyPermission("faq.read", "faq.edit"), module: "faq" as ModuleKey },
    { to: "/app/requests", label: t("internalRequests"), icon: Inbox, show: true, module: "internal_requests" as ModuleKey },
    { to: "/app/academy", label: "My Training", icon: GraduationCap, show: hasPermission("academy.learn"), module: "academy" as ModuleKey },
  ].filter((i) => i.show && gate(i.module));

  const adminNav = [
    {
      to: "/app/admin/command-center",
      label: "Command Center",
      icon: LayoutDashboard,
      show: hasAnyPermission("dashboard.view", "analytics.view", "ai_audit.run"),
      module: "executive_dashboard" as ModuleKey,
    },
    { to: "/app/admin/knowledge-gaps", label: "Knowledge Gaps", icon: AlertTriangle, show: hasAnyPermission("knowledge.manage", "analytics.view"), module: "knowledge_gaps" as ModuleKey },
    { to: "/app/admin/sop-generator", label: "AI SOP Generator", icon: Sparkles, show: hasPermission("sop.generate"), module: "ai_sop_generator" as ModuleKey },
    { to: "/app/admin/academy", label: "Academy Manager", icon: GraduationCap, show: hasPermission("academy.manage"), module: "academy" as ModuleKey },
    { to: "/app/admin/users", label: t("users"), icon: Users, show: hasAnyPermission("user.create", "user.update", "user.delete"), module: null as ModuleKey | null },
    { to: "/app/admin/audit", label: t("auditLog"), icon: ScrollText, show: hasPermission("audit.view"), module: "audit_log" as ModuleKey },
    { to: "/app/admin/integrations", label: "Integrations", icon: Sparkles, show: isPlatformAdmin || isPlatformOwner || hasAnyPermission("user.create", "user.update"), module: null as ModuleKey | null },
    { to: "/app/admin/sso-setup", label: "SSO / Microsoft", icon: ShieldCheck, show: isPlatformAdmin || isPlatformOwner || hasAnyPermission("user.create", "user.update"), module: "rbac" as ModuleKey },
    { to: "/app/admin/webhooks", label: "Webhooks", icon: Sparkles, show: isPlatformAdmin || isPlatformOwner || hasAnyPermission("user.create", "user.update"), module: null as ModuleKey | null },
    { to: "/app/admin/api-keys", label: "API keys", icon: KeyRound, show: isPlatformAdmin || isPlatformOwner || hasAnyPermission("user.create", "user.update"), module: null as ModuleKey | null },
    { to: "/app/brand", label: "Brand Center", icon: Sparkles, show: isPlatformAdmin || isPlatformOwner, module: "brand_center" as ModuleKey },
  ].filter((i) => i.show && gate(i.module));

  const platformNav = (isPlatformAdmin || isPlatformOwner)
    ? [
        { to: "/app/internal", label: "OPSQAI Internal", icon: Sparkles },
        { to: "/app/admin/platform", label: "Platform Administration", icon: ShieldCheck },
        { to: "/app/admin/companies", label: "Companies", icon: Building2 },
        { to: "/app/admin/subscriptions", label: "Subscriptions", icon: ShieldCheck },
        { to: "/app/admin/customers", label: "Enterprise Documents", icon: Building2 },
        { to: "/app/admin/support", label: "Support Inbox", icon: Inbox },
        { to: "/app/admin/email", label: "Email Settings", icon: Inbox },
        { to: "/app/admin/email-logs", label: "Email Logs", icon: ScrollText },
        { to: "/app/admin/platform-admins", label: "Super Admins", icon: ShieldCheck },
      ]
    : [];

  const cycleLang = () => {
    const order: Array<"de" | "en" | "ro"> = ["en", "de", "ro"];
    const idx = order.indexOf(lang);
    setLang(order[(idx + 1) % order.length]);
  };
  const nextLangLabel = (() => {
    const order: Array<"de" | "en" | "ro"> = ["en", "de", "ro"];
    return order[(order.indexOf(lang) + 1) % order.length].toUpperCase();
  })();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  const linkCls =
    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground";

  const ActiveIndicator = () => (
    <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-sidebar-primary opacity-0 group-data-[status=active]:opacity-100 shadow-[0_0_12px_var(--color-sidebar-primary)]" />
  );

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex h-full flex-col text-sidebar-foreground" style={{ background: "var(--gradient-sidebar)" }}>
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
      <div className="px-3 pt-3"><GlobalSearch asButton /></div>
      {isPlatformAdmin && companies.length > 0 && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 mb-1.5">Viewing workspace</div>
          <Select
            value={activeCompanyId ?? "__all__"}
            onValueChange={(v) => setActiveCompanyId(v === "__all__" ? null : v)}
          >
            <SelectTrigger className="h-8 bg-sidebar-accent/40 border-sidebar-border text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All companies (global)</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.is_system ? `★ ${c.name}` : c.name}
                </SelectItem>
              ))}

            </SelectContent>
          </Select>
        </div>
      )}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">Workspace</div>
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: item.exact }}
            className={linkCls}
          >
            <ActiveIndicator />
            <item.icon className="h-4 w-4 shrink-0 text-sidebar-foreground/60 group-data-[status=active]:text-sidebar-primary transition-colors" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
        {adminNav.length > 0 && (
          <>
            <div className="pt-5 pb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {t("admin")}
            </div>
            {adminNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={linkCls}
              >
                <ActiveIndicator />
                <item.icon className="h-4 w-4 shrink-0 text-sidebar-foreground/60 group-data-[status=active]:text-sidebar-primary transition-colors" />
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </>
        )}
        {platformNav.length > 0 && (
          <>
            <div className="pt-5 pb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Platform
            </div>
            {platformNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={linkCls}
              >
                <ActiveIndicator />
                <item.icon className="h-4 w-4 shrink-0 text-sidebar-foreground/60 group-data-[status=active]:text-sidebar-primary transition-colors" />
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button
          onClick={cycleLang}
          aria-label={`Switch language to ${nextLangLabel}`}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-sidebar-foreground/75 hover:bg-sidebar-accent transition-colors"
        >
          <Languages className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
          <span className="font-mono text-xs">{lang.toUpperCase()} → {nextLangLabel}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-sidebar-foreground/85 hover:bg-sidebar-accent transition-colors">
              <span className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-sidebar-primary/40 to-sidebar-primary/10 border border-sidebar-primary/30 grid place-items-center text-sidebar-primary text-[11px] font-semibold uppercase">
                {user?.email?.slice(0, 2) ?? "OP"}
              </span>
              <span className="truncate flex-1 text-left">{user?.email}</span>
              <ChevronDown className="h-3 w-3 text-sidebar-foreground/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { navigate({ to: "/app/profile" }); onNavigate?.(); }}>
              <UserCircle className="h-4 w-4 mr-2" />{t("myProfile")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onNavigate?.();
                if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("opsqai:open-support"));
              }}
            >
              <LifeBuoy className="h-4 w-4 mr-2" />Support &amp; Tickets
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />{t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(3.5rem + env(safe-area-inset-top))" }}
      >
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground -ml-1">
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
          <SubscriptionStatusBanner />
          <WorkspaceContextBanner />
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
