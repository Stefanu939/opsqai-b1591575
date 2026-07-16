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
        <StatCard label="Latest score" value={latest ? `${latest.score}/100` : "—"} icon={LineChart} />
        <StatCard label="Passed" value={latest?.passed ?? 0} icon={CheckCircle2} />
        <StatCard label="Warnings" value={latest?.warnings ?? 0} icon={AlertTriangle} />
        <StatCard label="Critical" value={latest?.critical ?? 0} icon={ShieldCheck} />
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
            <ul className="divide-y divide-border">
              {audits.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => setSelected(a)}
                    className={`w-full text-left p-3 hover:bg-accent/40 transition-colors ${(selected?.id ?? latest?.id) === a.id ? "bg-accent" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-semibold">{a.score}/100</span>
                      <Badge variant="outline" className="text-[10px]">
                        {a.maturity ?? "—"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(a.created_at).toLocaleString()} · {a.passed} passed ·{" "}
                      {a.warnings} warn · {a.critical} crit
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            {(() => {
              const row = selected ?? latest;
              if (!row) return null;
              const s = row.summary as Record<string, unknown> | null;
              const exec = (s?.executiveSummary as string | undefined) ?? "";
              return (
                <div className="space-y-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Executive summary
                    </div>
                    <h2 className="font-display text-xl font-semibold">
                      Score {row.score}/100 — {row.maturity ?? "—"}
                    </h2>
                    <div className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{exec || "—"}</p>
                  <div className="grid grid-cols-3 gap-3 text-sm border-t border-border pt-3">
                    <div>
                      <div className="text-muted-foreground text-xs">Passed</div>
                      <div className="font-medium">{row.passed}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Warnings</div>
                      <div className="font-medium">{row.warnings}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Critical</div>
                      <div className="font-medium">{row.critical}</div>
                    </div>
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
