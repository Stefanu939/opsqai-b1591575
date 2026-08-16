import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAuditRecommendations,
  listAiAudits,
  runWorkspaceAudit,
} from "@/lib/ai-features.functions";
import { useAuth } from "@/lib/auth-context";
import { ModulePage } from "@/components/app/module-page";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { MetricTile } from "@/components/ui/metric-tile";
import { Panel } from "@/components/ui/panel";
import { AreaTrend } from "@/components/ui/mini-chart";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Play,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  HelpCircle,
  GraduationCap,
  UserCheck,
  ClipboardCheck,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState, type ReactNode } from "react";
import { useCountUp } from "@/lib/use-count-up";
import type {
  AuditIntelligence,
  AuditRecommendation,
  RecommendationKind,
} from "@/lib/audit-recommendations";


export const Route = createFileRoute("/_authenticated/app/audit")({
  head: () => ({ meta: [{ title: "AI Audit — OPSQAI" }] }),
  component: AiAuditPage,
});

interface AuditRow {
  id: string;
  score: number;
  maturity: string | null;
  passed: number;
  warnings: number;
  critical: number;
  summary: unknown;
  created_at: string;
}

function AiAuditPage() {
  const { hasPermission, activeCompanyId } = useAuth();
  const canRun = hasPermission("ai_audit.run");
  const listFn = useServerFn(listAiAudits);
  const runFn = useServerFn(runWorkspaceAudit);
  const [running, setRunning] = useState(false);
  const [justRan, setJustRan] = useState(false);
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const list = useQuery({
    queryKey: ["ai-audits", activeCompanyId ?? null],
    queryFn: () => listFn({ data: { company_id: activeCompanyId ?? null } }),
  });

  const audits = (list.data?.audits ?? []) as AuditRow[];
  const latest = audits[0];

  async function run() {
    setRunning(true);
    try {
      await runFn({ data: { company_id: activeCompanyId ?? null } } as never);

      setJustRan(true);
      window.setTimeout(() => setJustRan(false), 1800);
      toast.success("Audit completed");
      await list.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const scoreTone =
    latest && latest.score >= 80 ? "gold" : latest && latest.score >= 60 ? "default" : latest ? "danger" : "muted";

  const trend = [...audits]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-12)
    .map((a) => ({ label: new Date(a.created_at).toLocaleDateString(), score: a.score }));

  return (
    <ModulePage
      eyebrow="Assurance"
      title="AI Audit"
      description="Grounded audit of your workspace knowledge, sources, coverage, and confidence. Every run is signed and stored for compliance."
      actions={
        canRun ? (
          <Button onClick={run} loading={running} success={justRan}>
            {!running && !justRan && <Play className="h-4 w-4 mr-1" />}
            {running ? "Running audit…" : justRan ? "Audit complete" : "Run new audit"}
          </Button>
        ) : null
      }
    >
      <BentoGrid>
        <BentoItem span={3} index={0}>
          <MetricTile
            label="Latest score"
            value={latest ? <CountValue value={latest.score} suffix="/100" /> : "—"}
            hint={latest?.maturity ?? "Not measured"}
            icon={LineChart}
            series={trend.map((t) => t.score)}
            tone={scoreTone === "gold" ? "gold" : scoreTone === "danger" ? "danger" : "default"}
          />
        </BentoItem>
        <BentoItem span={3} index={1}>
          <MetricTile
            label="Passed"
            value={<CountValue value={latest?.passed ?? 0} />}
            hint="Checks OK"
            icon={CheckCircle2}
            tone="success"
          />
        </BentoItem>
        <BentoItem span={3} index={2}>
          <MetricTile
            label="Warnings"
            value={<CountValue value={latest?.warnings ?? 0} />}
            hint="Attention needed"
            icon={AlertTriangle}
            tone={latest && latest.warnings > 0 ? "warning" : "default"}
          />
        </BentoItem>
        <BentoItem span={3} index={3}>
          <MetricTile
            label="Critical"
            value={<CountValue value={latest?.critical ?? 0} />}
            hint="Immediate action"
            icon={ShieldCheck}
            tone={latest && latest.critical > 0 ? "danger" : "default"}
          />
        </BentoItem>

        {trend.length > 1 && (
          <BentoItem span={12} index={4}>
            <Panel
              title="Maturity trend"
              description="Audit score across the last runs"
              icon={LineChart}
              glass
            >
              <AreaTrend data={trend} xKey="label" yKey="score" height={140} />
            </Panel>
          </BentoItem>
        )}
      </BentoGrid>

      <RecommendationsSection companyId={activeCompanyId ?? null} />

      {list.isLoading ? (
        <div className="grid gap-4 md:grid-cols-[1fr_1.5fr]">
          <Panel>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </Panel>
          <Panel>
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </Panel>
        </div>
      ) : audits.length === 0 ? (
        <Panel>
          <EmptyState
            icon={LineChart}
            title="No audits yet"
            description="Run your first AI audit to score workspace maturity and identify knowledge gaps."
            action={
              canRun ? (
                <Button onClick={run} loading={running} success={justRan}>
                  {!running && !justRan && <Play className="h-4 w-4 mr-1" />} Run audit
                </Button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-[1fr_1.5fr]">
          <Panel title="Audit history" icon={LineChart} flush>
            <ul className="divide-y divide-border">
              {audits.map((a) => {
                const isActive = (selected?.id ?? latest?.id) === a.id;
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => setSelected(a)}
                      className={`relative w-full text-left p-3 pl-4 hover:bg-accent/40 transition-colors ${isActive ? "bg-accent/60" : ""}`}
                    >
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gold"
                        />
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-lg font-semibold tabular-nums">
                          {a.score}
                          <span className="text-xs text-muted-foreground font-normal">/100</span>
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {a.maturity ?? "—"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(a.created_at).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-[color:var(--success)]" />
                          {a.passed}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          {a.warnings}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-destructive" />
                          {a.critical}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel glass bodyClassName="p-6">
            {(() => {
              const row = selected ?? latest;
              if (!row) return null;
              const s = row.summary as Record<string, unknown> | null;
              const exec = (s?.executiveSummary as string | undefined) ?? "";
              const scoreColor =
                row.score >= 80
                  ? "text-gold"
                  : row.score >= 60
                    ? "text-foreground"
                    : "text-destructive";
              return (
                <div className="space-y-5">
                  <div className="flex items-start gap-5">
                    <ScoreRing score={row.score} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                        Executive summary
                      </div>
                      <h2 className={`font-display text-2xl font-semibold mt-1 ${scoreColor}`}>
                        {row.maturity ?? "Assessment complete"}
                      </h2>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(row.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <SettleIn delay={520}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                      {exec || "—"}
                    </p>
                  </SettleIn>
                  <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
                    <MiniStat
                      label="Passed"
                      value={row.passed}
                      icon={CheckCircle2}
                      tone="success"
                    />
                    <MiniStat
                      label="Warnings"
                      value={row.warnings}
                      icon={AlertTriangle}
                      tone="warning"
                    />
                    <MiniStat
                      label="Critical"
                      value={row.critical}
                      icon={ShieldCheck}
                      tone="danger"
                    />
                  </div>
                </div>
              );
            })()}
          </Panel>
        </div>
      )}
    </ModulePage>
  );
}


/** Small animated counter — a KPI change should read as movement, not a swap. */
function CountValue({ value, suffix }: { value: number; suffix?: string }) {
  const shown = useCountUp(value);
  return (
    <span className="tabular-nums">
      {shown}
      {suffix && <span className="text-xs text-muted-foreground font-normal">{suffix}</span>}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const shown = useCountUp(clamped);
  const stroke =
    clamped >= 80
      ? "var(--gold)"
      : clamped >= 60
        ? "var(--primary)"
        : "var(--destructive)";
  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
        <circle
          cx="40"
          cy="40"
          r="32"
          fill="none"
          stroke="var(--border)"
          strokeWidth="6"
        />
        <circle
          cx="40"
          cy="40"
          r="32"
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 480ms var(--ease-out-expo, ease-out)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-xl font-semibold tabular-nums text-foreground">
          {shown}
        </span>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-[color:var(--success)]"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-destructive";
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        <Icon className={`h-3.5 w-3.5 ${toneClass}`} />
        {label}
      </div>
      <div className="font-display text-xl font-semibold tabular-nums mt-1 text-foreground">
        <CountValue value={value} />
      </div>
    </div>
  );
}

/**
 * SettleIn — reveals content only after the numbers above have finished
 * animating, so a run reads as a process with a conclusion.
 */
function SettleIn({ delay, children }: { delay: number; children: ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  return (
    <div className={shown ? "oq-enter" : "opacity-0"} aria-busy={!shown}>
      {children}
    </div>
  );
}

const KIND_META: Record<
  RecommendationKind,
  { label: string; icon: typeof FileText }
> = {
  sop: { label: "New SOP", icon: FileText },
  faq: { label: "New FAQ", icon: HelpCircle },
  course: { label: "Build course", icon: GraduationCap },
  course_assignment: { label: "Assign course", icon: UserCheck },
  quiz: { label: "Add quiz", icon: ClipboardCheck },
  policy_review: { label: "Policy review", icon: ShieldCheck },
};

const PRIORITY_CLASS: Record<string, string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  high: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  medium: "border-border bg-accent/40",
  low: "border-border bg-muted/40 text-muted-foreground",
};

function RecommendationsSection({ companyId }: { companyId: string | null }) {
  const recsFn = useServerFn(getAuditRecommendations);
  const q = useQuery({
    queryKey: ["audit-recommendations", companyId],
    queryFn: () => recsFn({ data: { company_id: companyId } } as never),
  });
  const [showAll, setShowAll] = useState(false);

  if (q.isLoading) {
    return (
      <Card className="p-4 mb-6 space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }
  if (q.isError || !q.data) return null;

  const intel = q.data as AuditIntelligence;
  const recs = intel.recommendations ?? [];
  const visible = showAll ? recs : recs.slice(0, 6);

  return (
    <Card className="card-enterprise p-4 md:p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Recommended actions
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Derived from recurring unanswered questions, learning friction and knowledge coverage.
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-lg font-semibold tabular-nums flex items-center gap-1">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              {intel.frictionIndex}
            </div>
            <div className="text-[11px] text-muted-foreground">Friction index</div>
          </div>
          <div>
            <div className="text-lg font-semibold tabular-nums">{intel.selfServiceRate}%</div>
            <div className="text-[11px] text-muted-foreground">Self-service rate</div>
          </div>
        </div>
      </div>

      {recs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No gaps detected — knowledge coverage and learning signals look healthy.
        </p>
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {visible.map((r: AuditRecommendation, idx: number) => {
              const meta = KIND_META[r.kind];
              const Icon = meta.icon;
              return (
                <li
                  key={r.id}
                  style={{ animationDelay: `${idx * 45}ms` }}
                  className="oq-enter rounded-lg border border-border p-3 oq-lift bg-card/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {meta.label}
                      </span>
                    </div>
                    <Badge variant="outline" className={PRIORITY_CLASS[r.priority]}>
                      {r.priority}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm font-medium leading-snug">{r.title}</div>
                  <p className="text-xs text-muted-foreground mt-1">{r.rationale}</p>
                  {r.evidence.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {r.evidence.map((e, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground">
                          • {e}
                        </li>
                      ))}
                    </ul>
                  )}
                  {r.suggestedCourse && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="secondary">{r.suggestedCourse.format}</Badge>
                      <Badge variant="secondary">{r.suggestedCourse.difficulty}</Badge>
                      <Badge variant="secondary">
                        {r.suggestedCourse.estimatedMinutes} min
                      </Badge>
                      <Badge variant="secondary">
                        pass ≥ {r.suggestedCourse.passingScore}%
                      </Badge>
                      <Badge variant="secondary">due in {r.suggestedCourse.dueInDays}d</Badge>
                      {r.suggestedCourse.mandatory && <Badge>mandatory</Badge>}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{r.department ?? "Company-wide"}</span>
                    <span>
                      +{r.expectedScoreImprovement} pts · {r.effort} effort
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {recs.length > 6 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show less" : `Show all ${recs.length} recommendations`}
            </Button>
          )}
        </>
      )}

      {intel.learnerCoaching.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            People who need support
          </div>
          <ul className="divide-y divide-border">
            {intel.learnerCoaching.slice(0, 6).map((l) => (
              <li key={l.userId} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {l.department ?? "No department"} · {l.reason}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm tabular-nums font-semibold">{l.frictionScore}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {l.questionsPerLearningHour} q/h
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
