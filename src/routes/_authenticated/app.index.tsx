import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getDashboardOverview, getDashboardActivity, getExecutiveInsights,
} from "@/lib/dashboard.functions";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  MessageSquare, Brain, AlertTriangle, ShieldAlert, BookOpen, HelpCircle,
  LayoutTemplate, ClipboardCheck, ScrollText, Users, Sparkles, Gauge,
  TrendingUp, FileText, Lightbulb,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({ component: ExecutiveDashboard });

const RANGES = [
  { key: "today", label: "Today", days: 0, bucket: "hour" as const },
  { key: "7d", label: "7 Days", days: 7, bucket: "day" as const },
  { key: "month", label: "This Month", days: 30, bucket: "day" as const },
  { key: "30d", label: "30 Days", days: 30, bucket: "day" as const },
];

function ExecutiveDashboard() {
  const { activeCompanyId } = useAuth() as any;
  const overviewFn = useServerFn(getDashboardOverview);
  const activityFn = useServerFn(getDashboardActivity);
  const insightsFn = useServerFn(getExecutiveInsights);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [rangeKey, setRangeKey] = useState("7d");

  const range = RANGES.find((r) => r.key === rangeKey)!;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      overviewFn({ data: { companyId: activeCompanyId ?? null } }),
      insightsFn({ data: { companyId: activeCompanyId ?? null } }).catch(() => ({ insights: [] })),
    ]).then(([o, i]) => {
      if (!alive) return;
      setData(o); setInsights(i.insights);
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [activeCompanyId]);

  useEffect(() => {
    const to = new Date();
    const from = new Date(to);
    if (range.key === "today") from.setHours(0, 0, 0, 0);
    else from.setDate(to.getDate() - range.days);
    activityFn({
      data: {
        companyId: activeCompanyId ?? null,
        from: from.toISOString(),
        to: to.toISOString(),
        bucket: range.bucket,
      },
    }).then((r) => setActivity(r.rows)).catch(() => setActivity([]));
  }, [rangeKey, activeCompanyId]);

  const k = data?.kpis ?? {};
  const health = data?.health ?? { score: 0, label: "—" };
  const status = data?.knowledgeStatus ?? { complete: 0, inProgress: 0, missing: 0 };
  const top = data?.topSops ?? [];
  const critical = data?.criticalSops ?? [];
  const lastAudit = data?.lastAudit;

  const kpiCards = [
    { label: "Questions Answered", value: k.questionsAnswered ?? 0, icon: MessageSquare, sub: `${k.questionsToday ?? 0} today` },
    { label: "AI Confidence", value: `${Math.round((Number(k.avgConfidence) || 0) * 100)}%`, icon: Brain, sub: "Last 30d" },
    { label: "Knowledge Gaps", value: k.openGaps ?? 0, icon: AlertTriangle, sub: "Open" },
    { label: "Critical SOPs", value: k.criticalSops ?? 0, icon: ShieldAlert, sub: "Active" },
    { label: "Documents", value: k.documents ?? 0, icon: BookOpen, sub: "" },
    { label: "FAQs", value: k.faqs ?? 0, icon: HelpCircle, sub: "" },
    { label: "Templates", value: k.templates ?? 0, icon: LayoutTemplate, sub: "" },
    { label: "AI Audits", value: k.aiAudits ?? 0, icon: ClipboardCheck, sub: "" },
    { label: "Audit Events", value: k.auditEvents ?? 0, icon: ScrollText, sub: "Last 30d" },
    { label: "Active Users", value: k.activeUsers ?? 0, icon: Users, sub: "Last 30d" },
    { label: "Workspaces", value: k.workspaces ?? 0, icon: Sparkles, sub: "" },
    { label: "Health Score", value: `${health.score ?? 0}`, icon: Gauge, sub: health.label },
  ];

  const donut = useMemo(
    () => [
      { name: "Complete", value: status.complete, color: "var(--chart-1, #22c55e)" },
      { name: "In Progress", value: status.inProgress, color: "var(--chart-2, #eab308)" },
      { name: "Missing", value: status.missing, color: "var(--chart-3, #ef4444)" },
    ],
    [status],
  );

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Executive Command Center</p>
          <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">Operational overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">Live KPIs, health and AI insights for your workspace.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key} onClick={() => setRangeKey(r.key)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${rangeKey === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >{r.label}</button>
          ))}
        </div>
      </header>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-[92px] rounded-xl" />)
          : kpiCards.map((c) => (
            <Card key={c.label} className="card-enterprise hover-lift p-4 border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{c.label}</div>
                  <div className="text-2xl font-semibold tracking-tight mt-1 tabular-nums">{c.value}</div>
                  {c.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</div>}
                </div>
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary shrink-0">
                  <c.icon className="h-4 w-4" />
                </div>
              </div>
            </Card>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 mb-6">
        {/* Health */}
        <Card className="card-enterprise border-0 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Workspace Health</div>
            <Gauge className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-5xl font-bold tracking-tight tabular-nums">{health.score}</div>
            <div className="text-sm text-muted-foreground">/100</div>
          </div>
          <Badge variant="secondary" className="mt-2">{health.label}</Badge>
          <div className="mt-4 space-y-2">
            <Progress value={health.score} className="h-2" />
            <div className="text-[11px] text-muted-foreground grid grid-cols-2 gap-1 mt-2">
              {Object.entries(health.breakdown ?? {}).map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="capitalize">{k.replace(/([A-Z])/g, " $1")}</span><span className="font-mono">{String(v)}</span></div>
              ))}
            </div>
          </div>
        </Card>

        {/* Insights */}
        <Card className="card-enterprise border-0 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Executive Insights · AI Generated</div>
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          {insights.length === 0 ? (
            <div className="text-sm text-muted-foreground">Gathering signals…</div>
          ) : (
            <ul className="space-y-2.5">
              {insights.map((i, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Activity + Knowledge status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 mb-6">
        <Card className="card-enterprise border-0 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Activity Overview</div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="bucket" tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })} fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v) => new Date(v).toLocaleString()}
                />
                <Area type="monotone" dataKey="questions" stroke="hsl(var(--primary))" fill="url(#g1)" name="Questions" />
                <Area type="monotone" dataKey="conversations" stroke="#a78bfa" fill="transparent" name="Conversations" />
                <Area type="monotone" dataKey="aiResponses" stroke="#22d3ee" fill="transparent" name="AI Responses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-enterprise border-0 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Knowledge Status</div>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={2}>
                  {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Audit summary + critical SOPs + top sops */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        <Card className="card-enterprise border-0 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Last AI Audit</div>
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </div>
          {lastAudit ? (
            <>
              <div className="text-3xl font-semibold tabular-nums">{Math.round(lastAudit.score)}/100</div>
              <div className="text-xs text-muted-foreground">{new Date(lastAudit.created_at).toLocaleString()}</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><div className="text-lg font-semibold text-emerald-500">{lastAudit.passed}</div><div className="text-[10px] uppercase text-muted-foreground">Passed</div></div>
                <div><div className="text-lg font-semibold text-amber-500">{lastAudit.warnings}</div><div className="text-[10px] uppercase text-muted-foreground">Warnings</div></div>
                <div><div className="text-lg font-semibold text-red-500">{lastAudit.critical}</div><div className="text-[10px] uppercase text-muted-foreground">Critical</div></div>
              </div>
              <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                <Link to="/app/admin/ai-audit">Open Full AI Audit</Link>
              </Button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              No audit yet.
              <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                <Link to="/app/admin/ai-audit">Run first audit</Link>
              </Button>
            </div>
          )}
        </Card>

        <Card className="card-enterprise border-0 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Critical SOPs</div>
            <ShieldAlert className="h-4 w-4 text-primary" />
          </div>
          {critical.length === 0 ? (
            <div className="text-sm text-muted-foreground">All critical SOPs are healthy.</div>
          ) : (
            <ul className="space-y-2">
              {critical.slice(0, 6).map((c: any) => (
                <li key={c.id} className="text-sm flex items-start justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {c.code && <span className="font-mono text-[10px] text-muted-foreground mr-1.5">{c.code}</span>}
                    {c.title}
                  </span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{c.reason}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="card-enterprise border-0 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Top SOPs</div>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          {top.length === 0 ? (
            <div className="text-sm text-muted-foreground">No usage data yet.</div>
          ) : (
            <ul className="space-y-2">
              {top.map((s: any, i: number) => (
                <li key={i} className="text-sm flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {s.code && <span className="font-mono text-[10px] text-muted-foreground mr-1.5">{s.code}</span>}
                    {s.title || "(unknown)"}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{s.usage}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
