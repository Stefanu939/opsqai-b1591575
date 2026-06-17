import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, MessageSquare, BookOpen, HelpCircle, Users, LogOut, Menu, X, Languages } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/logo.png";

export function AppShell({ children }: { children: ReactNode }) {
  const { isAdmin, signOut, user } = useAuth();
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = [
    { to: "/", label: t("dashboard"), icon: LayoutDashboard, exact: true },
    { to: "/chat", label: t("chat"), icon: MessageSquare },
    { to: "/knowledge", label: t("knowledge"), icon: BookOpen },
    { to: "/faq", label: t("faq"), icon: HelpCircle },
    ...(isAdmin ? [{ to: "/admin/users", label: t("users"), icon: Users }] : []),
  ];

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
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">{t("tagline")}</div>
        </div>
      </div>
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
      </nav>
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button
          onClick={() => setLang(lang === "de" ? "en" : "de")}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
        >
          <Languages className="h-4 w-4" />
          <span className="font-mono text-xs">{lang.toUpperCase()} → {lang === "de" ? "EN" : "DE"}</span>
        </button>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" />
          <span className="truncate">{t("signOut")}</span>
        </button>
        <div className="px-3 pt-2 text-[11px] text-sidebar-foreground/50 truncate">{user?.email}</div>
      </div>
    </div>
  );

  // hide path indicator unused
  void useLocation;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile header + sheet */}
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

      <main className={cn("flex-1 min-w-0 flex flex-col", "pt-14 md:pt-0")}>
        {children}
      </main>
    </div>
  );
}
