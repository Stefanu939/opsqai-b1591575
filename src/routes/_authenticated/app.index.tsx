import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  BookOpen,
  Users,
  Building2,
  MessageSquare,
  X,
  Sparkles,
  ArrowRight,
  Activity,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardOverview as getOnboardingOverview } from "@/lib/dashboard-overview.functions";
import {
  getDashboardOverview as getDashboardData,
  getDashboardActivity,
  getExecutiveInsights,
} from "@/lib/dashboard.functions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  DashboardFilters,
  DEFAULT_FILTERS,
  rangeToWindow,
  type DashboardFilterState,
} from "@/components/app/dashboard-filters";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — OPSQAI" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  loader: async ({ context }) => {
    try {
      const overview = await getOnboardingOverview();
      (context as { queryClient?: { setQueryData: (k: unknown, v: unknown) => void } })
        .queryClient?.setQueryData(["dashboard-overview"], overview);
      return overview;
    } catch {
      return null;
    }
  },
  component: Dashboard,
});

type CardId = "upload" | "sops" | "invite" | "departments" | "chat";

const DISMISS_KEY = "opsqai.dashboard.dismissed.v1";
const FILTERS_KEY = "opsqai.dashboard.filters.v1";

function readDismissed(): Set<CardId> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as CardId[]);
  } catch {
    return new Set();
  }
}

function readFilters(): DashboardFilterState {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<DashboardFilterState>;
    return {
      range: parsed.range ?? DEFAULT_FILTERS.range,
      bucket: parsed.bucket ?? DEFAULT_FILTERS.bucket,
      widgets: Array.isArray(parsed.widgets) ? parsed.widgets : DEFAULT_FILTERS.widgets,
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function Dashboard() {
  const probe = useServerFn(getOnboardingOverview);
  const { data } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => probe(),
  });

  const [dismissed, setDismissed] = useState<Set<CardId>>(new Set());
  useEffect(() => setDismissed(readDismissed()), []);

  const dismiss = (id: CardId) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  const name =
    (data?.firstName || "").trim().split(/\s+/)[0] ||
    (data?.displayName || "").trim().split(/\s+/)[0] ||
    "there";

  const company = (data?.companyName || "").trim();

  const cards: {
    id: CardId;
    icon: typeof FileText;
    title: string;
    body: string;
    cta: string;
    to: string;
  }[] = [
    {
      id: "upload",
      icon: FileText,
      title: "Upload your first document",
      body: "Add a PDF, Word doc, or spreadsheet to your Knowledge Base and OPSQAI will ground answers on it.",
      cta: "Upload",
      to: "/app/knowledge",
    },
    {
      id: "sops",
      icon: BookOpen,
      title: "Import your SOPs",
      body: "Bring standard operating procedures in one place, versioned and searchable.",
      cta: "Import",
      to: "/app/knowledge",
    },
    {
      id: "invite",
      icon: Users,
      title: "Invite your team",
      body: "Give supervisors, managers and workers access with role-based permissions.",
      cta: "Invite",
      to: "/app/users",
    },
    {
      id: "departments",
      icon: Building2,
      title: "Set up departments",
      body: "Group people and documents by department for cleaner routing and reporting.",
      cta: "Configure",
      to: "/app/organization",
    },
    {
      id: "chat",
      icon: MessageSquare,
      title: "Chat with AI",
      body: "Ask a question — even before you upload docs — to see how grounded answers look.",
      cta: "Open chat",
      to: "/app/chat",
    },
  ];

  const visible = cards.filter((c) => !dismissed.has(c.id));
  const isEmptyWorkspace = data?.isEmpty !== false;

  return (
    <div className="min-h-full bg-background text-foreground">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-line bg-gold-soft px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gold">
          <Sparkles className="h-3 w-3" />
          {isEmptyWorkspace ? "Get started" : "Operational overview"}
        </div>
        <PageHeader
          title={
            isEmptyWorkspace ? `Welcome to OPSQAI, ${name}` : `${company || "Workspace"} dashboard`
          }
          description={
            isEmptyWorkspace
              ? (company ? `Your ${company} workspace is ready. ` : "Your workspace is ready. ") +
                "Complete the steps below to get the most out of your platform."
              : "Live operational signals from your on-premise knowledge platform."
          }
          className="mt-4"
        />
      </div>

      {isEmptyWorkspace ? (
        /* Onboarding cards */
        <div className="max-w-6xl mx-auto px-6 py-8">
          {!data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-5 border-border/60 space-y-3">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-8 w-24" />
                </Card>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="You're all set"
              description="Nothing left to do here — head over to chat to start working."
              action={
                <Button asChild>
                  <Link to="/app/chat">
                    Open chat
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((c) => (
                <Card
                  key={c.id}
                  className="relative p-5 border-border/60 flex flex-col group hover:border-gold-line/60 transition-colors"
                >
                  <button
                    type="button"
                    aria-label={`Dismiss ${c.title}`}
                    onClick={() => dismiss(c.id)}
                    className="absolute right-2 top-2 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="h-9 w-9 rounded-md bg-gold-soft border border-gold-line flex items-center justify-center">
                    <c.icon className="h-4 w-4 text-gold" />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{c.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed flex-1">
                    {c.body}
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-4 self-start">
                    <Link to={c.to}>{c.cta}</Link>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <DashboardWidgets />
      )}
    </div>
  );
}

function DashboardWidgets() {
  const [filters, setFilters] = useState<DashboardFilterState>(DEFAULT_FILTERS);
  useEffect(() => setFilters(readFilters()), []);

  const update = (next: DashboardFilterState) => {
    setFilters(next);
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const overview = useServerFn(getDashboardData);
  const activity = useServerFn(getDashboardActivity);
  const insights = useServerFn(getExecutiveInsights);

  const window = useMemo(() => rangeToWindow(filters.range), [filters.range]);

  const overviewQ = useQuery({
    queryKey: ["dash", "overview"],
    queryFn: () => overview({ data: {} }),
  });
  const activityQ = useQuery({
    queryKey: ["dash", "activity", window.from, window.to, filters.bucket],
    queryFn: () => activity({ data: { from: window.from, to: window.to, bucket: filters.bucket } }),
    enabled: filters.widgets.includes("activity"),
  });
  const insightsQ = useQuery({
    queryKey: ["dash", "insights"],
    queryFn: () => insights({ data: {} }),
    enabled: filters.widgets.includes("insights"),
  });

  const show = (id: DashboardFilterState["widgets"][number]) => filters.widgets.includes(id);
  const kpis = overviewQ.data?.kpis;
  const health = overviewQ.data?.health;
  const status = overviewQ.data?.knowledgeStatus;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <DashboardFilters value={filters} onChange={update} />

      {overviewQ.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        show("kpis") && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Questions (30d)"
              value={kpis?.questions30d ?? "—"}
              icon={MessageSquare}
              hint={`${kpis?.questionsToday ?? 0} today`}
            />
            <StatCard label="Documents" value={kpis?.documents ?? "—"} icon={FileText} />
            <StatCard label="FAQ entries" value={kpis?.faqs ?? "—"} icon={HelpCircle} />
            <StatCard
              label="Open gaps"
              value={kpis?.openGaps ?? "—"}
              icon={AlertTriangle}
              className={kpis && kpis.openGaps > 0 ? "border-amber-500/30 bg-amber-500/5" : undefined}
            />
          </div>
        )
      )}

      {show("health") && (
        <Card className="p-5 border-border/60">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gold" />
              Workspace health
            </h2>
            <Badge variant="outline">{health?.label ?? "—"}</Badge>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <span className="font-display text-4xl font-semibold tabular-nums">
              {health?.score ?? "—"}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          {status && (
            <p className="mt-3 text-xs text-muted-foreground">
              Knowledge: {status.complete} complete · {status.inProgress} in progress ·{" "}
              {status.missing} missing
            </p>
          )}
        </Card>
      )}

      {show("activity") && (
        <Card className="p-5 border-border/60">
          <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <Activity className="h-4 w-4 text-gold" />
            Activity — last {filters.range}
          </h2>
          <div className="mt-4 h-56">
            {activityQ.isLoading ? (
              <Skeleton className="h-full w-full rounded-md" />
            ) : (activityQ.data?.rows?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No activity in this window.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityQ.data?.rows ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                    tickFormatter={(v: string) => String(v).slice(5, 10)}
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
                  <ReTooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="questions"
                    stroke="var(--gold)"
                    fill="var(--gold)"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="aiResponses"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      )}

      {show("insights") && (
        <Card className="p-5 border-border/60">
          <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            Executive insights
          </h2>
          {insightsQ.isLoading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-4/5" />
              ))}
            </div>
          ) : (
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {(insightsQ.data?.insights ?? []).map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                  {line}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {show("topSops") && (
          <Card className="p-5 border-border/60">
            <h2 className="text-sm font-semibold tracking-tight">Top SOPs</h2>
            <ul className="mt-4 space-y-3">
              {(overviewQ.data?.topSops ?? []).map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{s.title ?? s.code ?? "Untitled"}</span>
                  <span className="tabular-nums text-muted-foreground">{s.usage}</span>
                </li>
              ))}
              {(overviewQ.data?.topSops ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">No usage recorded yet.</li>
              )}
            </ul>
          </Card>
        )}

        {show("criticalSops") && (
          <Card className="p-5 border-border/60">
            <h2 className="text-sm font-semibold tracking-tight">Critical SOPs</h2>
            <ul className="mt-4 space-y-3">
              {(overviewQ.data?.criticalSops ?? []).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{s.title}</span>
                  <Badge variant="outline" className="shrink-0">
                    {s.reason}
                  </Badge>
                </li>
              ))}
              {(overviewQ.data?.criticalSops ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">Nothing flagged as critical.</li>
              )}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
