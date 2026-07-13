import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useDemoSession } from "@/lib/demo/session";
import { DemoCountdownStrip } from "@/components/demo/countdown-strip";
import { DemoReadOnlyProvider } from "@/components/demo/read-only-dialog";
import { DemoEndedDialog } from "@/components/demo/ended-dialog";
import { LogoMark } from "@/components/brand/logo";
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  HelpCircle,
  GraduationCap,
  Activity,
  Users,
  BarChart3,
} from "lucide-react";

export const Route = createFileRoute("/demo/app")({
  head: () => ({
    meta: [
      { title: "Atlas Logistics · OPSQAI Interactive Demo" },
      {
        name: "description",
        content: "Explore a fully-configured, read-only enterprise OPSQAI workspace.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoAppLayout,
});

type MenuItem = { to: string; label: string; icon: React.ElementType; exact?: boolean };
const MENU: MenuItem[] = [
  { to: "/demo/app", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/demo/app/chat", label: "AI Chat", icon: MessageSquare },
  { to: "/demo/app/knowledge", label: "Knowledge Base", icon: BookOpen },
  { to: "/demo/app/faq", label: "FAQ", icon: HelpCircle },
  { to: "/demo/app/academy", label: "Academy", icon: GraduationCap },
  { to: "/demo/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/demo/app/audit", label: "Audit log", icon: Activity },
  { to: "/demo/app/users", label: "People & roles", icon: Users },
];

function DemoAppLayout() {
  const { active } = useDemoSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!active) navigate({ to: "/demo", replace: true });
  }, [active, navigate]);

  if (!active) return null;

  return (
    <DemoReadOnlyProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <DemoCountdownStrip />
        <div className="border-b border-border/50 bg-background/80 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center gap-6">
            <Link to="/demo/app" className="flex items-center gap-2 shrink-0">
              <LogoMark size={28} className="text-foreground" />
              <span className="font-semibold tracking-tight text-[15px]">OPSQAI</span>
            </Link>
            <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto flex-1">
              {MENU.map((i) => {
                const isActive = i.exact ? pathname === i.to : pathname.startsWith(i.to);
                return (
                  <Link
                    key={i.to}
                    to={i.to as "/demo/app"}
                    className={`px-3 py-1.5 rounded-md text-[13px] flex items-center gap-1.5 transition-colors ${isActive ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                  >
                    <i.icon className="h-3.5 w-3.5" />
                    {i.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <nav className="md:hidden flex items-center gap-0.5 overflow-x-auto px-3 pb-2">
            {MENU.map((i) => {
              const isActive = i.exact ? pathname === i.to : pathname.startsWith(i.to);
              return (
                <Link
                  key={i.to}
                  to={i.to as "/demo/app"}
                  className={`px-2.5 py-1 rounded-md text-[12px] flex items-center gap-1 shrink-0 ${isActive ? "bg-muted text-foreground font-medium" : "text-muted-foreground"}`}
                >
                  <i.icon className="h-3.5 w-3.5" />
                  {i.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <main className="flex-1">
          <Outlet />
        </main>

        <DemoEndedDialog />
      </div>
    </DemoReadOnlyProvider>
  );
}
