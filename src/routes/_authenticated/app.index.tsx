import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Sparkles, BookOpen, HelpCircle, Inbox, BarChart3,
  ArrowRight, ScrollText, ClipboardCheck, Search,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: OperationalHome,
});

function OperationalHome() {
  const { user, companyName, hasPermission, hasAnyPermission } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name =
    (user?.user_metadata?.first_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  const quickActions: Array<{
    to: any; label: string; desc: string; icon: any; show: boolean; primary?: boolean;
  }> = [
    {
      to: "/app/chat", label: "Ask the AI Assistant",
      desc: "Get instant, source-grounded answers from your operational knowledge.",
      icon: MessageSquare, primary: true,
      show: hasPermission("chat.use") || hasAnyPermission("sop.read", "knowledge.manage"),
    },
    {
      to: "/app/workspace", label: "Open AI Workspace",
      desc: "Analyse, compare and generate documents from session-scoped files.",
      icon: Sparkles,
      show: hasPermission("workspace.use") || hasPermission("workspace.manage"),
    },
    {
      to: "/app/knowledge", label: "Browse Knowledge Base",
      desc: "Open SOPs, manuals and procedures across your workspace.",
      icon: BookOpen,
      show: hasAnyPermission("sop.read", "knowledge.manage", "sop.edit"),
    },
    {
      to: "/app/faq", label: "Browse FAQs",
      desc: "Frequently asked questions answered by your team.",
      icon: HelpCircle,
      show: hasAnyPermission("faq.read", "faq.edit"),
    },
    {
      to: "/app/requests", label: "Internal Requests",
      desc: "Submit a question or resolve one for your colleagues.",
      icon: Inbox, show: true,
    },
  ].filter((a) => a.show);

  const adminShortcuts: Array<{ to: any; label: string; icon: any; show: boolean }> = [
    { to: "/app/admin/dashboard", label: "Executive Dashboard", icon: BarChart3, show: hasPermission("dashboard.view") },
    { to: "/app/admin/audit", label: "Audit Log", icon: ScrollText, show: hasPermission("audit.view") },
    { to: "/app/admin/ai-audit", label: "AI Workspace Audit", icon: ClipboardCheck, show: hasPermission("ai_audit.run") },
  ].filter((a) => a.show);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
      <header className="mb-8">
        <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">
          {companyName ?? "Your workspace"}
        </p>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">
          {greeting}, {name} 👋
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl">
          Welcome back. Pick up a conversation, dive into a document or jump straight into the AI assistant.
        </p>
      </header>

      {/* Featured chat shortcut */}
      <Card className="card-enterprise border-0 p-5 md:p-7 mb-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="relative grid md:grid-cols-[1fr_auto] gap-5 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] text-primary">
              <Sparkles className="h-3 w-3" /> AI Assistant
            </div>
            <h2 className="mt-3 text-xl md:text-2xl font-semibold tracking-tight">
              What do you want to know today?
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
              Ask anything about your SOPs, procedures, safety rules or operations — answers are grounded in your own knowledge.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 md:items-end shrink-0">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
              <Link to="/app/chat">Start a conversation <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link to="/app/workspace"><Sparkles className="mr-2 h-4 w-4" />Open Workspace</Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick actions */}
      <section className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-3">Quick actions</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {quickActions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group card-enterprise hover-lift border-0 p-5 flex flex-col text-left transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary group-hover:bg-primary/15 transition-colors">
                  <a.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="mt-4 font-semibold text-[14.5px]">{a.label}</div>
              <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">{a.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Admin shortcuts — only render when user can access at least one */}
      {adminShortcuts.length > 0 && (
        <section>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-3">For managers & admins</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {adminShortcuts.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="group card-enterprise hover-lift border-0 p-4 flex items-center gap-3"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary shrink-0">
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{a.label}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tip / search footer */}
      <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
        <Search className="h-3.5 w-3.5" />
        Tip: press <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">⌘K</kbd> to search across SOPs, FAQs, users and audit history.
      </div>
    </div>
  );
}
