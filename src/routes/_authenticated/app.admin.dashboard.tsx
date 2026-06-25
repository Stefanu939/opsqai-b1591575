import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/admin-stats.functions";
import { getKnowledgeGapStats } from "@/lib/knowledge-gaps.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { Users, UserCheck, BookOpen, HelpCircle, MessageSquare, TrendingUp, Building2, AlertTriangle, CheckCircle2, Gauge } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/dashboard")({
  component: AdminDashboard,
});

interface CompanyRow { id: string; name: string; users: number; docs: number; questions30d: number; active: boolean }
interface Stats {
  isPlatformAdmin: boolean;
  totalUsers: number; activeUsers: number; totalDocs: number; totalFaqs: number; totalQuestions: number;
  topDocs: { title: string; count: number }[];
  topQuestions: { question: string; count: number }[];
  companyBreakdown: CompanyRow[];
}

function AdminDashboard() {
  const { t } = useT();
  const { isAdmin, isManager, isPlatformAdmin } = useAuth();
  const fetchStats = useServerFn(getAdminStats);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!isAdmin && !isManager && !isPlatformAdmin) return;
    fetchStats().then((s) => setStats(s as Stats)).catch(() => {});
  }, [isAdmin, isManager, isPlatformAdmin, fetchStats]);

  if (!isAdmin && !isManager && !isPlatformAdmin) return <div className="p-8 text-sm text-muted-foreground">Admin only.</div>;
  if (!stats) return <div className="p-8 text-sm text-muted-foreground">…</div>;

  const kpis = [
    { label: t("totalUsers"), value: stats.totalUsers, icon: Users },
    { label: t("activeUsers"), value: stats.activeUsers, icon: UserCheck },
    { label: t("totalDocs"), value: stats.totalDocs, icon: BookOpen },
    { label: t("totalFaqs"), value: stats.totalFaqs, icon: HelpCircle },
    { label: t("totalQuestions"), value: stats.totalQuestions, icon: MessageSquare },
  ];

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {stats.isPlatformAdmin ? "Platform Dashboard" : t("adminDashboard")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {stats.isPlatformAdmin ? "Activity across all companies on the platform." : t("adminDashboardDesc")}
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-8">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden p-5 hover:shadow-md transition-shadow border-border/60">
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary/40" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium truncate">{k.label}</div>
                <div className="text-3xl font-semibold tracking-tight mt-1 tabular-nums">{k.value}</div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {stats.isPlatformAdmin && stats.companyBreakdown.length > 0 && (
        <Card className="p-5 mb-6 border-border/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />Company health (last 30 days)
            </h2>
            <Link to="/app/admin/companies" className="text-xs text-primary hover:underline">Manage →</Link>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Company</th>
                  <th className="px-2 py-2 font-medium text-right">Users</th>
                  <th className="px-2 py-2 font-medium text-right">Docs</th>
                  <th className="px-2 py-2 font-medium text-right">Questions</th>
                  <th className="px-2 py-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.companyBreakdown.map((c) => (
                  <tr key={c.id} className="border-t border-border/60">
                    <td className="px-2 py-2.5 font-medium truncate">{c.name}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{c.users}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{c.docs}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{c.questions30d}</td>
                    <td className="px-2 py-2.5 text-right">
                      <Badge variant={c.active ? "default" : "secondary"} className="font-normal">
                        {c.active ? "Active" : "Suspended"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 border-border/60">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />{t("mostUsedDocs")}
          </h2>
          {stats.topDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <ul className="space-y-2">
              {stats.topDocs.map((d) => (
                <li key={d.title} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{d.title}</span>
                  <span className="font-mono text-xs px-2 py-0.5 bg-primary/10 text-primary rounded tabular-nums">{d.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5 border-border/60">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />{t("mostAskedQuestions")}
          </h2>
          {stats.topQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <ul className="space-y-2">
              {stats.topQuestions.map((q) => (
                <li key={q.question} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{q.question}</span>
                  <span className="font-mono text-xs px-2 py-0.5 bg-primary/10 text-primary rounded tabular-nums">{q.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
