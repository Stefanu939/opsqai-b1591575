import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, MessageSquare, BookOpen, HelpCircle, Users, LogOut, Menu, X,
  Languages, BarChart3, ScrollText, UserCircle, ChevronDown, Building2, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logo from "@/assets/logo.png";

export function AppShell({ children }: { children: ReactNode }) {
  const { isAdmin, isManager, isPlatformAdmin, signOut, user, companyName, activeCompanyId, setActiveCompanyId } = useAuth();
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const canAdmin = isAdmin || isManager || isPlatformAdmin;

  useEffect(() => {
    if (!isPlatformAdmin) return;
    supabase.from("companies").select("id, name").order("name").then(({ data }) => setCompanies(data ?? []));
  }, [isPlatformAdmin]);

  const nav = [
    { to: "/", label: t("dashboard"), icon: LayoutDashboard, exact: true },
    { to: "/chat", label: t("chat"), icon: MessageSquare },
    { to: "/knowledge", label: t("knowledge"), icon: BookOpen },
    { to: "/faq", label: t("faq"), icon: HelpCircle },
  ];
  const adminNav = [
    ...(canAdmin ? [{ to: "/admin/dashboard", label: t("adminDashboard"), icon: BarChart3 }] : []),
    ...((isAdmin || isPlatformAdmin) ? [{ to: "/admin/users", label: t("users"), icon: Users }] : []),
    ...(canAdmin ? [{ to: "/admin/audit", label: t("auditLog"), icon: ScrollText }] : []),
  ];
  const platformNav = isPlatformAdmin
    ? [
        { to: "/admin/companies", label: "Companies", icon: Building2 },
        { to: "/admin/platform-admins", label: "Super Admins", icon: ShieldCheck },
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

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <img src={logo} alt="" width={32} height={32} className="brightness-0 invert" />
        <div className="min-w-0">
          <div className="font-semibold tracking-tight truncate">{t("appName")}</div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60 truncate">
            {companyName ?? t("tagline")}
          </div>
        </div>
      </div>
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
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: item.exact }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground data-[status=active]:border-l-2 data-[status=active]:border-sidebar-primary"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
        {adminNav.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {t("admin")}
            </div>
            {adminNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground data-[status=active]:border-l-2 data-[status=active]:border-sidebar-primary"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </>
        )}
        {platformNav.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Platform
            </div>
            {platformNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground data-[status=active]:border-l-2 data-[status=active]:border-sidebar-primary"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button
          onClick={cycleLang}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
        >
          <Languages className="h-4 w-4" />
          <span className="font-mono text-xs">{lang.toUpperCase()} → {nextLangLabel}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
              <UserCircle className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1 text-left">{user?.email}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { navigate({ to: "/profile" }); onNavigate?.(); }}>
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
          <img src={logo} alt="" width={24} height={24} className="brightness-0 invert" />
          <span className="font-semibold tracking-tight text-sm">{t("appName")}</span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-0">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 min-w-0 flex flex-col pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
