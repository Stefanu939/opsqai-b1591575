import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/admin-stats.functions";
import { Card } from "@/components/ui/card";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { Users, UserCheck, BookOpen, HelpCircle, MessageSquare, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

interface Stats {
  totalUsers: number; activeUsers: number; totalDocs: number; totalFaqs: number; totalQuestions: number;
  topDocs: { title: string; count: number }[];
  topQuestions: { question: string; count: number }[];
}

function AdminDashboard() {
  const { t } = useT();
  const { isAdmin, isManager } = useAuth();
  const fetchStats = useServerFn(getAdminStats);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!isAdmin && !isManager) return;
    fetchStats().then((s) => setStats(s as Stats)).catch(() => {});
  }, [isAdmin, isManager, fetchStats]);

  if (!isAdmin && !isManager) return <div className="p-8 text-sm text-muted-foreground">Admin only.</div>;
  if (!stats) return <div className="p-8 text-sm text-muted-foreground">…</div>;

  const kpis = [
    { label: t("totalUsers"), value: stats.totalUsers, icon: Users },
    { label: t("activeUsers"), value: stats.activeUsers, icon: UserCheck },
    { label: t("totalDocs"), value: stats.totalDocs, icon: BookOpen },
    { label: t("totalFaqs"), value: stats.totalFaqs, icon: HelpCircle },
    { label: t("totalQuestions"), value: stats.totalQuestions, icon: MessageSquare },
  ];

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">{t("adminDashboard")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("adminDashboardDesc")}</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-primary/10 grid place-items-center text-primary">
                <k.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-semibold tracking-tight font-mono">{k.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{k.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
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
                  <span className="font-mono text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">{d.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
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
                  <span className="font-mono text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">{q.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
