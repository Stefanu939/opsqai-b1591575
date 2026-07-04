import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runWorkspaceAudit, listAiAudits } from "@/lib/ai-features.functions";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardCheck, Loader2, Download, AlertTriangle, ShieldCheck, Lightbulb,
  ListChecks, TrendingUp, Target, Activity, Sparkles, ArrowRight, CheckCircle2,
  AlertCircle, XCircle, FileText, GraduationCap, BarChart3, Building2, Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/admin/ai-audit")({ component: AiAuditPage });

export { AiAuditPage };

const MATURITY_LEVELS = [
  { level: 1, name: "Initial", threshold: 0 },
  { level: 2, name: "Developing", threshold: 35 },
  { level: 3, name: "Managed", threshold: 55 },
  { level: 4, name: "Optimized", threshold: 70 },
  { level: 5, name: "AI Ready", threshold: 85 },
];

function riskTone(risk: string) {
  switch (risk) {
    case "critical": return "text-red-600 bg-red-500/10 border-red-500/20";
    case "high": return "text-red-500 bg-red-500/10 border-red-500/20";
    case "medium": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    default: return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  }
}

function benchmarkLabel(v: string) {
  return String(v || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function benchmarkTone(v: string) {
  if (v === "top_20" || v === "above_average") return "text-emerald-500";
  if (v === "average") return "text-amber-500";
  return "text-red-500";
}

const ACTION_ROUTES: Record<string, { label: string; to: string; icon: any }> = {
  generate_sop: { label: "Generate SOP", to: "/app/admin/sop-generator", icon: FileText },
  generate_policy: { label: "Generate Policy", to: "/app/admin/sop-generator", icon: FileText },
  generate_work_instruction: { label: "Generate Work Instruction", to: "/app/admin/sop-generator", icon: FileText },
  generate_template: { label: "Generate Template", to: "/app/admin/sop-generator", icon: FileText },
  create_quiz: { label: "Create Quiz", to: "/app/academy/courses", icon: GraduationCap },
  assign_training: { label: "Assign Training", to: "/app/academy/courses", icon: GraduationCap },
  open_knowledge_gap: { label: "Open Knowledge Gap", to: "/app/admin/knowledge-gaps", icon: Target },
  run_new_audit: { label: "Run New Audit", to: "/app/admin/ai-audit", icon: ClipboardCheck },
};

function AiAuditPage() {
  const { hasPermission } = useAuth();
  if (!hasPermission("ai_audit.run")) {
    return <div className="p-8 text-sm text-muted-foreground">You don't have permission to access this page.</div>;
  }
  const run = useServerFn(runWorkspaceAudit);
  const list = useServerFn(listAiAudits);
  const [audits, setAudits] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<any>(null);

  const load = async () => {
    try {
      const r = await list();
      setAudits(r.audits);
      if (!current && r.audits[0]) setCurrent(r.audits[0]);
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const onRun = async () => {
    setBusy(true);
    try {
      const r = await run();
      toast.success(`Audit complete · score ${r.score}/100`);
      await load();
    } catch (e) { toast.error(String(e)); } finally { setBusy(false); }
  };

  const onExport = () => {
    if (!current) return;
    const blob = new Blob([JSON.stringify(current.summary ?? current, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `workspace-audit-${current.id}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const onPrint = () => window.print();

  const summary = current?.summary ?? {};
  const categories: any[] = summary.categories ?? [];
  const radarData = categories.map((c) => ({ subject: c.label, score: c.score, fullMark: 100 }));
  const currentLevel = MATURITY_LEVELS.find((l) => l.level === summary.maturityLevel) ?? MATURITY_LEVELS[1];
  const nextLevel = MATURITY_LEVELS.find((l) => l.level === (currentLevel.level + 1));
  const pointsToNext = nextLevel ? Math.max(0, nextLevel.threshold - (current?.score ?? 0)) : 0;

  const trendData = useMemo(() => {
    return [...audits].reverse().map((a) => ({
      date: new Date(a.created_at).toLocaleDateString(),
      score: Math.round(a.score),
    }));
  }, [audits]);

  const categoryTrend = useMemo(() => {
    if (audits.length < 2) return [];
    const prev = audits[1]?.summary?.categories as any[] | undefined;
    if (!Array.isArray(prev)) return [];
    return categories.map((c) => {
      const p = prev.find((x) => x.key === c.key);
      return { label: c.label, delta: p ? c.score - p.score : 0 };
    });
  }, [audits, categories]);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto print:p-0 print:max-w-none">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 print:hidden">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Governance</p>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" /> Operational Maturity Assessment
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-driven enterprise audit — maturity, risk, compliance and action plan.
          </p>
        </div>
        <div className="flex gap-2">
          {current && <Button variant="outline" size="sm" onClick={onExport}><Download className="h-4 w-4 mr-1" /> Export JSON</Button>}
          {current && <Button variant="outline" size="sm" onClick={onPrint}>Save as PDF</Button>}
          <Button onClick={onRun} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-1" />}
            Run AI Audit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* History */}
        <Card className="card-enterprise border-0 p-5 lg:col-span-1 print:hidden">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">History</div>
          {audits.length === 0 ? (
            <div className="text-sm text-muted-foreground">No audits yet.</div>
          ) : (
            <ul className="space-y-1.5 max-h-[520px] overflow-y-auto">
              {audits.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => setCurrent(a)}
                    className={`w-full text-left text-xs rounded-md px-2 py-2 border ${current?.id === a.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                  >
                    <div className="flex justify-between"><span>{new Date(a.created_at).toLocaleString()}</span><span className="font-mono">{Math.round(a.score)}</span></div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 capitalize">{String(a.maturity).replace(/_/g, " ")}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:col-span-3 space-y-4">
          {!current ? (
            <Card className="card-enterprise border-0 p-10 text-center text-sm text-muted-foreground">
              Run your first audit to generate an executive report.
            </Card>
          ) : (
            <>
              {/* Cover / Executive Summary */}
              <Card className="card-enterprise border-0 p-6">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-primary font-semibold mb-3">
                  <Sparkles className="h-3.5 w-3.5" /> Executive Summary
                </div>
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="text-4xl font-semibold tabular-nums">{Math.round(current.score)}<span className="text-lg text-muted-foreground">/100</span></div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="capitalize">Level {currentLevel.level} · {currentLevel.name}</Badge>
                      {nextLevel && (
                        <span className="text-xs text-muted-foreground">
                          → {nextLevel.name} in <span className="font-medium text-foreground">{pointsToNext}</span> pts
                        </span>
                      )}
                    </div>
                    <Progress value={current.score} className="h-2 mt-3 max-w-md" />
                    <p className="text-sm mt-4 leading-relaxed">{summary.executiveSummary}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <KpiStat value={current.passed} tone="emerald" label="Passed" />
                    <KpiStat value={current.warnings} tone="amber" label="Warnings" />
                    <KpiStat value={current.critical} tone="red" label="Critical" />
                  </div>
                </div>

                {/* Maturity ladder */}
                <div className="mt-6">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Maturity Model</div>
                  <div className="grid grid-cols-5 gap-2">
                    {MATURITY_LEVELS.map((l) => (
                      <div key={l.level}
                           className={`rounded-md border p-2 text-center text-xs ${l.level === currentLevel.level ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}>
                        <div className="text-[10px] uppercase text-muted-foreground">L{l.level}</div>
                        <div className={`font-medium ${l.level === currentLevel.level ? "text-primary" : ""}`}>{l.name}</div>
                        <div className="text-[10px] text-muted-foreground">{l.threshold}+</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Category scores + Radar */}
              {categories.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="card-enterprise border-0 p-5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="h-3.5 w-3.5" /> Category Maturity
                    </div>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} stroke="hsl(var(--border))" />
                          <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                  <Card className="card-enterprise border-0 p-5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Category Scores</div>
                    <ul className="space-y-2.5">
                      {categories.map((c) => (
                        <li key={c.key}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium">{c.label}</span>
                            <span className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${riskTone(c.risk)}`}>{c.risk}</span>
                              <span className="tabular-nums font-mono">{c.score}</span>
                            </span>
                          </div>
                          <Progress value={c.score} className="h-1.5" />
                          {c.note && <div className="text-[10px] text-muted-foreground mt-1">{c.note}</div>}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              )}

              {/* Executive KPIs */}
              {summary.kpis && (
                <Card className="card-enterprise border-0 p-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5" /> Executive KPIs
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(summary.kpis).map(([k, v]) => (
                      <div key={k} className="rounded-md border border-border p-3">
                        <div className="text-[10px] uppercase text-muted-foreground">{k.replace(/_/g, " ")}</div>
                        <div className="text-xl font-semibold tabular-nums mt-1">{String(v)}{typeof v === "number" && (v as number) <= 100 ? "" : ""}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Findings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FindingsCard title="Strengths" icon={CheckCircle2} tone="emerald" items={Array.isArray(summary.strengths) ? summary.strengths : []} />
                <FindingsCard title="Opportunities" icon={Lightbulb} tone="sky" items={Array.isArray(summary.opportunities) ? summary.opportunities : []} />
                <FindingsCard title="Warnings" icon={AlertCircle} tone="amber" items={Array.isArray(summary.warnings) ? summary.warnings : []} />
                <FindingsCard title="Critical Findings" icon={XCircle} tone="red" items={Array.isArray(summary.critical) ? summary.critical : []} />
              </div>

              {/* Priority Action Plan */}
              {Array.isArray(summary.priorityActions) && summary.priorityActions.length > 0 && (
                <Card className="card-enterprise border-0 p-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                    <ListChecks className="h-3.5 w-3.5" /> Priority Action Plan
                  </div>
                  <ul className="space-y-3">
                    {summary.priorityActions.map((a: any, i: number) => {
                      const action = ACTION_ROUTES[a.action] ?? ACTION_ROUTES.generate_sop;
                      const Icon = action.icon;
                      return (
                        <li key={i} className="rounded-md border border-border p-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">Priority {a.priority ?? i + 1}</Badge>
                                <span className="font-medium text-sm">{a.title}</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2 text-xs">
                                <Meta label="Impact" value={a.impact} />
                                <Meta label="Effort" value={a.effort} />
                                <Meta label="Time" value={a.estimatedTime} />
                                <Meta label="Owner" value={a.department} />
                                <Meta label="+Score" value={`+${a.expectedScoreImprovement ?? 0}`} />
                              </div>
                            </div>
                            <Link to={action.to as any}>
                              <Button size="sm" variant="outline" className="print:hidden">
                                <Icon className="h-3.5 w-3.5 mr-1" /> {action.label}
                              </Button>
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              )}

              {/* Projection */}
              {summary.projection && (
                <Card className="card-enterprise border-0 p-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5" /> Maturity Projection
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <ProjBadge label="Current" value={summary.projection.current} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <ProjBadge label="After P1" value={summary.projection.afterPriority1} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <ProjBadge label="After P2" value={summary.projection.afterPriority2} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <ProjBadge label="Projected" value={summary.projection.projected} highlight />
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                      <Clock className="h-3.5 w-3.5" /> Timeline: {summary.projection.timeline}
                    </span>
                  </div>
                </Card>
              )}

              {/* Risk Matrix */}
              {Array.isArray(summary.riskMatrix) && summary.riskMatrix.length > 0 && (
                <Card className="card-enterprise border-0 p-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Operational Risk Matrix
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[10px] uppercase text-muted-foreground border-b border-border">
                          <th className="py-2 pr-3">Risk</th>
                          <th className="py-2 pr-3">Likelihood</th>
                          <th className="py-2 pr-3">Impact</th>
                          <th className="py-2 pr-3">Severity</th>
                          <th className="py-2">Mitigation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.riskMatrix.map((r: any, i: number) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="py-2 pr-3 font-medium">{r.risk}</td>
                            <td className="py-2 pr-3 capitalize">{r.likelihood}</td>
                            <td className="py-2 pr-3 capitalize">{r.impact}</td>
                            <td className="py-2 pr-3">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${riskTone(r.severity)}`}>{r.severity}</span>
                            </td>
                            <td className="py-2 text-muted-foreground">{r.mitigation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Compliance readiness */}
              {Array.isArray(summary.compliance) && summary.compliance.length > 0 && (
                <Card className="card-enterprise border-0 p-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5" /> Compliance Readiness
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {summary.compliance.map((f: any, i: number) => (
                      <div key={i} className="rounded-md border border-border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{f.framework}</span>
                          <span className="text-xs tabular-nums font-mono">{f.readiness}%</span>
                        </div>
                        <Progress value={f.readiness} className="h-1.5 mb-2" />
                        {Array.isArray(f.missing) && f.missing.length > 0 && (
                          <div className="text-[11px] text-muted-foreground">
                            <span className="uppercase text-[9px] tracking-wider">Missing:</span>{" "}
                            {f.missing.join(" · ")}
                          </div>
                        )}
                        {f.recommendation && <div className="text-[11px] mt-1">{f.recommendation}</div>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* AI Insights */}
              {Array.isArray(summary.aiInsights) && summary.aiInsights.length > 0 && (
                <Card className="card-enterprise border-0 p-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" /> AI Insights
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {summary.aiInsights.map((s: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Benchmark */}
              {summary.benchmark && (
                <Card className="card-enterprise border-0 p-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" /> Anonymous Benchmark
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(summary.benchmark).map(([k, v]) => (
                      <div key={k} className="rounded-md border border-border p-3">
                        <div className="text-[10px] uppercase text-muted-foreground">{k.replace(/_/g, " ")}</div>
                        <div className={`text-sm font-semibold mt-1 ${benchmarkTone(String(v))}`}>{benchmarkLabel(String(v))}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2">Compared to organizations of similar size. No customer data is exposed.</div>
                </Card>
              )}

              {/* Trend history */}
              {trendData.length >= 2 && (
                <Card className="card-enterprise border-0 p-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5" /> Trend History
                  </div>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                        <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {categoryTrend.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                      {categoryTrend.map((t) => (
                        <div key={t.label} className="rounded border border-border p-2 text-center">
                          <div className="text-[10px] uppercase text-muted-foreground">{t.label}</div>
                          <div className={`text-sm font-semibold ${t.delta > 0 ? "text-emerald-500" : t.delta < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                            {t.delta > 0 ? "+" : ""}{t.delta}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Metadata */}
              <Card className="card-enterprise border-0 p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Audit Metadata</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <Meta label="Audit ID" value={String(current.id).slice(0, 8)} />
                  <Meta label="Generated" value={new Date(current.created_at).toLocaleString()} />
                  <Meta label="Maturity" value={`L${currentLevel.level} · ${currentLevel.name}`} />
                  <Meta label="Generated by" value="OPSQAI" />
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiStat({ value, tone, label }: { value: number; tone: "emerald" | "amber" | "red"; label: string }) {
  const toneCls = tone === "emerald" ? "text-emerald-500" : tone === "amber" ? "text-amber-500" : "text-red-500";
  return (
    <div>
      <div className={`text-2xl font-semibold ${toneCls}`}>{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}

function FindingsCard({
  title, icon: Icon, tone, items,
}: { title: string; icon: any; tone: "emerald" | "sky" | "amber" | "red"; items?: any[] }) {
  const toneCls =
    tone === "emerald" ? "text-emerald-500" :
    tone === "sky" ? "text-sky-500" :
    tone === "amber" ? "text-amber-500" : "text-red-500";
  return (
    <Card className="card-enterprise border-0 p-5">
      <div className={`text-[10px] uppercase tracking-wider font-semibold mb-3 flex items-center gap-2 ${toneCls}`}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      {!items || items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No items.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((it: any, i: number) => (
            <li key={i} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-medium text-sm">{it.title}</span>
                {it.priority && <Badge variant="outline" className="text-[10px] capitalize">{it.priority}</Badge>}
              </div>
              {it.description && <p className="text-xs text-muted-foreground mt-1">{it.description}</p>}
              {(it.impact || it.recommendation) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-[11px]">
                  {it.impact && <div><span className="uppercase text-[9px] tracking-wider text-muted-foreground">Impact:</span> {it.impact}</div>}
                  {it.recommendation && <div><span className="uppercase text-[9px] tracking-wider text-muted-foreground">Recommendation:</span> {it.recommendation}</div>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "—"}</div>
    </div>
  );
}

function ProjBadge({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-2 text-center min-w-[92px] ${highlight ? "border-primary bg-primary/10" : "border-border"}`}>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${highlight ? "text-primary" : ""}`}>{Math.round(value)}</div>
    </div>
  );
}
