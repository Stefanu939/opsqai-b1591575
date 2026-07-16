import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAiAudits, runWorkspaceAudit } from "@/lib/ai-features.functions";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Play, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

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

      toast.success("Audit completed");
      list.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const scoreTone =
    latest && latest.score >= 80 ? "gold" : latest && latest.score >= 60 ? "default" : latest ? "danger" : "muted";

  return (
    <div className="p-6 md:p-10 max-w-6xl w-full mx-auto">
      <PageHeader
        eyebrow="Self-hosted"
        title="AI Audit"
        description="Grounded audit of your workspace knowledge, sources, coverage, and confidence. Every run is signed and stored for compliance."
        actions={
          canRun ? (
            <Button onClick={run} disabled={running}>
              <Play className="h-4 w-4 mr-1" />
              {running ? "Running…" : "Run new audit"}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard
          label="Latest score"
          value={latest ? `${latest.score}/100` : "—"}
          hint={latest?.maturity ?? "Not measured"}
          icon={LineChart}
          className={
            scoreTone === "gold"
              ? "border-[var(--gold-line)] bg-[var(--gold-soft)]/40"
              : scoreTone === "danger"
                ? "border-destructive/30 bg-destructive/5"
                : undefined
          }
        />
        <StatCard label="Passed" value={latest?.passed ?? 0} hint="Checks OK" icon={CheckCircle2} />
        <StatCard
          label="Warnings"
          value={latest?.warnings ?? 0}
          hint="Attention needed"
          icon={AlertTriangle}
          className={latest && latest.warnings > 0 ? "border-amber-500/30 bg-amber-500/5" : undefined}
        />
        <StatCard
          label="Critical"
          value={latest?.critical ?? 0}
          hint="Immediate action"
          icon={ShieldCheck}
          className={latest && latest.critical > 0 ? "border-destructive/30 bg-destructive/5" : undefined}
        />
      </div>

      {audits.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No audits yet"
          description="Run your first AI audit to score workspace maturity and identify knowledge gaps."
          action={
            canRun ? (
              <Button onClick={run} disabled={running}>
                <Play className="h-4 w-4 mr-1" /> Run audit
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid md:grid-cols-[1fr_1.5fr] gap-4">
          <Card className="p-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Audit history
            </div>
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
          </Card>
          <Card className="p-6">
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
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {exec || "—"}
                  </p>
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
          </Card>
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
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
          {clamped}
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
        {value}
      </div>
    </div>
  );
}
