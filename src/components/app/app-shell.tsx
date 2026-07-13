import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
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
  BarChart3,
  ScrollText,
  UserCircle,
  ChevronDown,
  Building2,
  ShieldCheck,
  Inbox,
  AlertTriangle,
  LineChart,
  Sparkles,
  ClipboardCheck,
  GraduationCap,
  KeyRound,
  LifeBuoy,
  Package,
  FileText,
  Mail,
  Wrench,
  Rocket,
  ShieldAlert,
  Webhook,
  Activity,
  Download,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { WorkspaceContextBanner } from "@/components/app/workspace-context-banner";
import { SubscriptionStatusBanner } from "@/components/app/subscription-status-banner";
import { useLicense, hasModule } from "@/lib/license";
import type { ModuleKey } from "@/lib/license-modules";
// SupportWidget is mounted globally in __root.tsx so it appears on marketing
// pages too. Do not remount here or the bubble/badge will duplicate.

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const {
    isPlatformAdmin,
    isPlatformOwner,
    signOut,
    user,
    companyName,
    activeCompanyId,
    setActiveCompanyId,
    hasPermission,
    hasAnyPermission,
  } = auth;
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const license = useLicense();
  const gate = (m: ModuleKey | null) => (m === null ? true : hasModule(license, m));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companies, setCompanies] = useState<
    Array<{ id: string; name: string; is_system?: boolean }>
  >([]);

  const deploymentQuery = useDeploymentInfo();
  const mode = deploymentQuery.data?.mode ?? getClientDeploymentMode();
  const isMC = mode === "mc";
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  // In MC deployment we render ONLY the dedicated Mission Control shell
  // (Noir & Gold PlatformSidebar via /app/platform/* layout). All other
  // authenticated routes are redirected there. This keeps the MC surface
  // clean and prevents the legacy multi-section app sidebar from showing.
  useEffect(() => {
    if (!isMC) return;
    const allowed =
      currentPath.startsWith("/app/platform") ||
      currentPath.startsWith("/app/admin") ||
      currentPath.startsWith("/app/profile") ||
      currentPath.startsWith("/app/docs") ||
      currentPath.startsWith("/app/brand") ||
      currentPath.startsWith("/portal");
    if (!allowed) {
      navigate({ to: "/app/platform/overview", replace: true });
    }
  }, [isMC, currentPath, navigate]);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    supabase
      .from("companies")
      .select("id, name, is_system")
      .order("is_system", { ascending: false })
      .order("name")
      .then(({ data }) => {
        setCompanies((data ?? []) as Array<{ id: string; name: string; is_system?: boolean }>);
      });
  }, [isPlatformAdmin]);

  // MC deployment: render children only — /app/platform/* has its own shell.
  if (isMC) {
    return <>{children}</>;
  }

  type NavItem = {
    to: string;
    label: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
    show: boolean;
    module?: ModuleKey | null;
  };

  // ---- Self-hosted (customer operational) navigation ----
  // Basic bundle (always visible): Overview, Chat, KB, FAQ, Knowledge Gaps,
  // AI Audit, Users, Subscription. Every other admin/operational item is
  // hidden until the customer licenses the matching module (gate via
  // `module` key + `filterNav`). No item definitions are removed — only the
  // gate values decide visibility.
  const selfhostWorkspace: NavItem[] = [
    {
      to: "/app",
      label: t("dashboard"),
      icon: LayoutDashboard,
      exact: true,
      show: true,
      module: null,
    },
    {
      to: "/app/chat",
      label: t("chat"),
      icon: MessageSquare,
      show: hasPermission("chat.use") || hasAnyPermission("sop.read", "knowledge.manage"),
      module: "chat",
    },
    {
      to: "/app/knowledge",
      label: t("knowledge"),
      icon: BookOpen,
      show: hasAnyPermission("sop.read", "knowledge.manage", "sop.edit"),
      module: "kb",
    },
    {
      to: "/app/faq",
      label: t("faq"),
      icon: HelpCircle,
      show: hasAnyPermission("faq.read", "faq.edit"),
      module: "faq",
    },
    {
      to: "/app/workspace",
      label: t("workspace"),
      icon: Sparkles,
      show: hasPermission("workspace.use") || hasPermission("workspace.manage"),
      module: "ai_workspace_audit",
    },
    {
      to: "/app/requests",
      label: t("internalRequests"),
      icon: Inbox,
      show: true,
      module: "internal_requests",
    },
    {
      to: "/app/academy",
      label: "My Training",
      icon: GraduationCap,
      show: hasPermission("academy.learn"),
      module: "academy",
    },
    {
      to: "/app/subscription",
      label: "Subscription",
      icon: Package,
      show: true,
      module: null,
    },
  ];

  const selfhostAdmin: NavItem[] = [
    {
      to: "/app/admin/knowledge-gaps",
      label: "Knowledge Gaps",
      icon: AlertTriangle,
      show: hasAnyPermission("knowledge.manage", "analytics.view"),
      module: null, // Basic per business rule
    },
    {
      to: "/app/admin/ai-audit",
      label: "AI Audit",
      icon: LineChart,
      show: hasPermission("ai_audit.run"),
      module: null, // Basic per business rule
    },
    {
      to: "/app/admin/users",
      label: t("users"),
      icon: Users,
      show: hasAnyPermission("user.create", "user.update", "user.delete"),
      module: null, // Basic per business rule
    },
    {
      to: "/app/admin/command-center",
      label: "Command Center",
      icon: LayoutDashboard,
      show: hasAnyPermission("dashboard.view", "analytics.view", "ai_audit.run"),
      module: "executive_dashboard",
    },
    {
      to: "/app/admin/sop-generator",
      label: "AI SOP Generator",
      icon: Sparkles,
      show: hasPermission("sop.generate"),
      module: "ai_sop_generator",
    },
    {
      to: "/app/admin/academy",
      label: "Academy Manager",
      icon: GraduationCap,
      show: hasPermission("academy.manage"),
      module: "academy",
    },
    {
      to: "/app/admin/analytics",
      label: "Analytics",
      icon: BarChart3,
      show: hasPermission("analytics.view"),
      module: "analytics",
    },
    {
      to: "/app/admin/integrations",
      label: "Integrations",
      icon: Sparkles,
      show: isPlatformAdmin || isPlatformOwner || hasAnyPermission("user.create", "user.update"),
      module: "rbac",
    },
    {
      to: "/app/admin/sso-setup",
      label: "SSO / Microsoft",
      icon: ShieldCheck,
      show: isPlatformAdmin || isPlatformOwner || hasAnyPermission("user.create", "user.update"),
      module: "rbac",
    },
    {
      to: "/app/admin/webhooks",
      label: "Webhooks",
      icon: Webhook,
      show: isPlatformAdmin || isPlatformOwner || hasAnyPermission("user.create", "user.update"),
      module: "rbac",
    },
    {
      to: "/app/admin/api-keys",
      label: "API keys",
      icon: KeyRound,
      show: isPlatformAdmin || isPlatformOwner || hasAnyPermission("user.create", "user.update"),
      module: "rbac",
    },
    {
      to: "/app/brand",
      label: "Brand Center",
      icon: Sparkles,
      show: isPlatformAdmin || isPlatformOwner,
      module: "brand_center",
    },
  ];

  const selfhostPlatform: NavItem[] =
    isPlatformAdmin || isPlatformOwner
      ? [
          {
            to: "/app/platform/setup",
            label: "Setup Wizard",
            icon: Rocket,
            show: true,
            module: null,
          },
          {
            to: "/app/platform/doctor",
            label: "System Doctor",
            icon: Wrench,
            show: true,
            module: null,
          },
          {
            to: "/app/platform/recovery",
            label: "Disaster Recovery",
            icon: ShieldAlert,
            show: true,
            module: null,
          },
          {
            to: "/app/platform/license-activation",
            label: "License Activation",
            icon: KeyRound,
            show: true,
            module: null,
          },
        ]
      : [];


  // ---- Management Center (platform management ONLY) navigation ----
  const mcAdmin = isPlatformAdmin || isPlatformOwner;

  const mcOverview: NavItem[] = [
    {
      to: "/app",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
      show: true,
      module: null,
    },
    {
      to: "/app/admin/dashboard",
      label: "Executive Dashboard",
      icon: BarChart3,
      show: mcAdmin,
      module: null,
    },
    {
      to: "/app/admin/analytics",
      label: "Analytics",
      icon: LineChart,
      show: mcAdmin,
      module: null,
    },
    {
      to: "/app/admin/monitoring",
      label: "Monitoring",
      icon: Activity,
      show: mcAdmin,
      module: null,
    },
  ];

  const mcEnterprise: NavItem[] = mcAdmin
    ? [
        {
          to: "/app/admin/companies",
          label: "Companies",
          icon: Building2,
          show: true,
          module: null,
        },
        {
          to: "/app/admin/customers",
          label: "Enterprise Documents",
          icon: FileText,
          show: true,
          module: null,
        },
        {
          to: "/app/admin/contacts",
          label: "Contacts",
          icon: Users,
          show: true,
          module: null,
        },
        {
          to: "/app/admin/installations",
          label: "Installations",
          icon: Package,
          show: true,
          module: null,
        },
        { to: "/portal", label: "Customer Portal", icon: LifeBuoy, show: true, module: null },
      ]
    : [];

  const mcLicensing: NavItem[] = mcAdmin
    ? [
        {
          to: "/app/platform/licenses",
          label: "Licenses & Releases",
          icon: KeyRound,
          show: true,
          module: null,
        },
        {
          to: "/app/platform/license-activation",
          label: "Activation Bundles",
          icon: Package,
          show: true,
          module: null,
        },
        {
          to: "/app/admin/module-catalog",
          label: "Module Catalog",
          icon: ClipboardCheck,
          show: true,
          module: null,
        },
        {
          to: "/app/admin/release-management",
          label: "Release Management",
          icon: Rocket,
          show: true,
          module: null,
        },
        {
          to: "/app/admin/maintenance",
          label: "Maintenance",
          icon: Wrench,
          show: true,
          module: null,
        },
      ]
    : [];

  const mcCommercial: NavItem[] = mcAdmin
    ? [
        {
          to: "/app/admin/subscriptions",
          label: "Orders & Subscriptions",
          icon: Package,
          show: true,
          module: null,
        },
        {
          to: "/app/admin/billing",
          label: "Billing",
          icon: KeyRound,
          show: true,
          module: null,
        },
        {
          to: "/app/admin/downloads",
          label: "Downloads",
          icon: Download,
          show: true,
          module: null,
        },
      ]
    : [];

  const mcOperations: NavItem[] = mcAdmin
    ? [
        { to: "/app/admin/support", label: "Support Inbox", icon: Inbox, show: true, module: null },
        {
          to: "/app/admin/audit",
          label: t("auditLog"),
          icon: ScrollText,
          show: hasPermission("audit.view"),
          module: null,
        },
        { to: "/app/admin/email", label: "Email Settings", icon: Mail, show: true, module: null },
        {
          to: "/app/admin/email-logs",
          label: "Email Logs",
          icon: ScrollText,
          show: true,
          module: null,
        },
      ]
    : [];

  const mcIntegrations: NavItem[] = mcAdmin
    ? [
        {
          to: "/app/admin/integrations",
          label: "Integrations",
          icon: Sparkles,
          show: true,
          module: null,
        },
        {
          to: "/app/admin/sso-setup",
          label: "SSO / SAML / OAuth",
          icon: ShieldCheck,
          show: true,
          module: null,
        },
        { to: "/app/admin/webhooks", label: "Webhooks", icon: Webhook, show: true, module: null },
        { to: "/app/admin/api-keys", label: "API Keys", icon: KeyRound, show: true, module: null },
        { to: "/app/admin/api-docs", label: "API Docs", icon: FileText, show: true, module: null },
      ]
    : [];

  const mcPlatformAdmin: NavItem[] = mcAdmin
    ? [
        {
          to: "/app/admin/platform",
          label: "Platform Administration",
          icon: ShieldCheck,
          show: true,
          module: null,
        },
        {
          to: "/app/admin/platform-admins",
          label: "Users & Roles",
          icon: Users,
          show: true,
          module: null,
        },
        { to: "/app/admin/users", label: "Directory", icon: Users, show: true, module: null },
        { to: "/app/brand", label: "Branding", icon: Sparkles, show: true, module: null },
        {
          to: "/app/platform/setup",
          label: "Setup Wizard",
          icon: Rocket,
          show: true,
          module: null,
        },
        {
          to: "/app/platform/doctor",
          label: "System Doctor",
          icon: Wrench,
          show: true,
          module: null,
        },
        {
          to: "/app/platform/recovery",
          label: "Disaster Recovery",
          icon: ShieldAlert,
          show: true,
          module: null,
        },
      ]
    : [];


  const filterNav = (items: NavItem[]) => items.filter((i) => i.show && gate(i.module ?? null));

  // Assemble grouped nav sections based on deployment mode.
  const sections: Array<{ label: string; items: NavItem[] }> = isMC
    ? [
        { label: "Overview", items: filterNav(mcOverview) },
        { label: "Enterprise", items: filterNav(mcEnterprise) },
        { label: "Licensing", items: filterNav(mcLicensing) },
        { label: "Commercial", items: filterNav(mcCommercial) },
        { label: "Operations", items: filterNav(mcOperations) },
        { label: "Integrations & API", items: filterNav(mcIntegrations) },
        { label: "Platform", items: filterNav(mcPlatformAdmin) },
      ]
    : [
        { label: "Workspace", items: filterNav(selfhostWorkspace) },
        { label: t("admin"), items: filterNav(selfhostAdmin) },
        { label: "Platform", items: filterNav(selfhostPlatform) },
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
    navigate({ to: "/app/profile" });
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
      {isPlatformAdmin && companies.length > 0 && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 mb-1.5">
            Viewing workspace
          </div>
          <Select
            value={activeCompanyId ?? "__all__"}
            onValueChange={(v) => setActiveCompanyId(v === "__all__" ? null : v)}
          >
            <SelectTrigger className="h-8 bg-sidebar-accent/40 border-sidebar-border text-xs">
              <SelectValue />
            </SelectTrigger>
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
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button
          onClick={cycleLang}
          aria-label={`Switch language to ${nextLangLabel}`}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-sidebar-foreground/75 hover:bg-sidebar-accent transition-colors"
        >
          <Languages className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
          <span className="font-mono text-xs">
            {lang.toUpperCase()} → {nextLangLabel}
          </span>
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
            <DropdownMenuItem
              onClick={() => {
                navigate({ to: "/app/profile" });
                onNavigate?.();
              }}
            >
              <UserCircle className="h-4 w-4 mr-2" />
              {t("myProfile")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onNavigate?.();
                if (typeof window !== "undefined")
                  window.dispatchEvent(new CustomEvent("opsqai:open-support"));
              }}
            >
              <LifeBuoy className="h-4 w-4 mr-2" />
              Support &amp; Tickets
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("signOut")}
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
