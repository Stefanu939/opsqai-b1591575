import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, MessageSquare, BookOpen, HelpCircle, Users, LogOut, Menu, X,
  Languages, BarChart3, ScrollText, UserCircle, ChevronDown, Building2, ShieldCheck, Inbox,
  AlertTriangle, LineChart, Sparkles, ClipboardCheck, GraduationCap,
} from "lucide-react";
import { GlobalSearch } from "@/components/app/global-search";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logo from "@/assets/opsqai-mark.png";
import { NotificationsBell } from "@/components/app/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { isPlatformAdmin, isPlatformOwner, signOut, user, companyName, activeCompanyId, setActiveCompanyId, hasPermission, hasAnyPermission } = auth;
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    supabase.from("companies").select("id, name").order("name").then(({ data }) => setCompanies(data ?? []));
  }, [isPlatformAdmin]);

  const nav = [
    { to: "/app", label: t("dashboard"), icon: LayoutDashboard, exact: true, show: true },
    { to: "/app/chat", label: t("chat"), icon: MessageSquare, show: hasPermission("chat.use") || hasAnyPermission("sop.read", "knowledge.manage") },
    { to: "/app/workspace", label: t("workspace"), icon: Sparkles, show: hasPermission("workspace.use") || hasPermission("workspace.manage") },
    { to: "/app/knowledge", label: t("knowledge"), icon: BookOpen, show: hasAnyPermission("sop.read", "knowledge.manage", "sop.edit") },
    { to: "/app/faq", label: t("faq"), icon: HelpCircle, show: hasAnyPermission("faq.read", "faq.edit") },
    { to: "/app/requests", label: t("internalRequests"), icon: Inbox, show: true },
    { to: "/app/academy", label: "Academy", icon: GraduationCap, show: hasPermission("academy.learn") },
  ].filter((i) => i.show);

  const adminNav = [
    { to: "/app/admin/dashboard", label: t("adminDashboard"), icon: BarChart3, show: hasPermission("dashboard.view") },
    { to: "/app/admin/analytics", label: "Analytics", icon: LineChart, show: hasPermission("analytics.view") },
    { to: "/app/admin/knowledge-gaps", label: "Knowledge Gaps", icon: AlertTriangle, show: hasAnyPermission("knowledge.manage", "analytics.view") },
    { to: "/app/admin/sop-generator", label: "AI SOP Generator", icon: Sparkles, show: hasPermission("sop.generate") },
    { to: "/app/admin/ai-audit", label: "AI Workspace Audit", icon: ClipboardCheck, show: hasPermission("ai_audit.run") },
    { to: "/app/admin/academy", label: "Academy Manager", icon: GraduationCap, show: hasPermission("academy.manage") },
    { to: "/app/admin/users", label: t("users"), icon: Users, show: hasAnyPermission("user.create", "user.update", "user.delete") },
    { to: "/app/admin/audit", label: t("auditLog"), icon: ScrollText, show: hasPermission("audit.view") },
  ].filter((i) => i.show);

  const platformNav = (isPlatformAdmin || isPlatformOwner)
    ? [
        { to: "/app/admin/platform", label: "Platform Administration", icon: ShieldCheck },
        { to: "/app/admin/companies", label: "Companies", icon: Building2 },
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
        <img src={logo} alt="" width={32} height={32} className="drop-shadow-[0_0_10px_oklch(0.82_0.14_200/0.55)]" />
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
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />{t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 shrink-0 border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between bg-sidebar text-sidebar-foreground px-4 h-14 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" width={24} height={24} />
          <span className="font-semibold tracking-tight text-sm">{t("appName")}</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle className="h-8 w-8" />
          <NotificationsBell />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-0">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <main className="flex-1 min-w-0 flex flex-col pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
