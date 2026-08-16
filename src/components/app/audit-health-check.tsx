import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CategoryBars, DonutBreakdown, ChartLegend } from "@/components/ui/mini-chart";
import { cn } from "@/lib/utils";

/** One narrative finding from the audit report. */
export interface AuditFinding {
  title?: string;
  description?: string;
  impact?: string;
  risk?: string;
  recommendation?: string;
  priority?: string;
}

export interface AuditCategory {
  key?: string;
  label?: string;
  score?: number;
  status?: string;
  risk?: string;
  note?: string;
}

export interface AuditComplianceItem {
  framework?: string;
  readiness?: number;
  missing?: string[];
  recommendation?: string;
}

export interface AuditReportShape {
  executiveSummary?: string;
  categories?: AuditCategory[];
  strengths?: AuditFinding[];
  opportunities?: AuditFinding[];
  warnings?: AuditFinding[];
  critical?: AuditFinding[];
  compliance?: AuditComplianceItem[];
  kpis?: Record<string, number>;
  riskMatrix?: Array<{
    risk?: string;
    likelihood?: string;
    impact?: string;
    severity?: string;
    mitigation?: string;
  }>;
}

type Severity = "passed" | "warning" | "critical";

/** Above these counts we never dump findings inline — the card opens a drill-down. */
const INLINE_LIMIT: Record<Severity, number> = { passed: 3, warning: 5, critical: 10 };

const KPI_LABELS: Record<string, string> = {
  knowledge_confidence: "Knowledge confidence",
  knowledge_coverage: "Coverage",
  critical_sop_coverage: "Critical SOPs",
  training_completion: "Training",
  compliance_readiness: "Compliance",
  ai_readiness: "AI readiness",
  document_freshness: "Doc freshness",
  employee_adoption: "Adoption",
  operational_risk: "Operational risk",
};

function tone(score: number) {
  if (score >= 70) return { text: "text-[color:var(--success)]", bar: "var(--success)" };
  if (score >= 40) return { text: "text-amber-600 dark:text-amber-400", bar: "var(--gold)" };
  return { text: "text-destructive", bar: "var(--destructive)" };
}

/**
 * Health Check — the operational read of one audit run: category bars,
 * KPI gauges, compliance readiness and the severity split.
 */
export function AuditHealthCheck({
  report,
  passed,
  warnings,
  critical,
}: {
  report: AuditReportShape;
  passed: number;
  warnings: number;
  critical: number;
}) {
  const categories = (report.categories ?? []).filter((c) => typeof c.score === "number");
  const kpis = Object.entries(report.kpis ?? {}).filter(([k]) => k in KPI_LABELS);
  const compliance = report.compliance ?? [];

  const barData = useMemo(
    () =>
      categories.map((c) => ({
        name: (c.label ?? c.key ?? "—").replace(/_/g, " ").slice(0, 14),
        score: Math.round(Number(c.score ?? 0)),
      })),
    [categories],
  );

  const split = [
    { name: "Passed", value: passed },
    { name: "Warnings", value: warnings },
    { name: "Critical", value: critical },
  ].filter((s) => s.value > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <Panel
        title="Health check"
        description="Every audited dimension scored on the same 0–100 scale"
        icon={Activity}
        glass
      >
        {barData.length > 0 ? (
          <>
            <CategoryBars data={barData} xKey="name" yKey="score" height={190} />
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {categories.map((c) => {
                const score = Math.round(Number(c.score ?? 0));
                const t = tone(score);
                return (
                  <li key={c.key ?? c.label} className="flex items-center gap-2 text-xs">
                    <span className="w-32 shrink-0 truncate text-muted-foreground">
                      {(c.label ?? c.key ?? "—").replace(/_/g, " ")}
                    </span>
                    <Progress value={score} className="h-1.5 flex-1" />
                    <span className={cn("w-9 text-right tabular-nums font-medium", t.text)}>
                      {score}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No category scoring in this run.</p>
        )}
      </Panel>

      <div className="grid gap-4">
        <Panel title="Severity split" description="Checks by outcome" icon={Gauge}>
          {split.length > 0 ? (
            <>
              <DonutBreakdown data={split} nameKey="name" valueKey="value" height={150} />
              <ChartLegend
                className="mt-2 justify-center"
                items={split.map((s) => ({ label: s.name, value: s.value }))}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing scored yet.</p>
          )}
        </Panel>

        {kpis.length > 0 && (
          <Panel title="Operational KPIs" description="Derived from live workspace signals" icon={Sparkles}>
            <ul className="grid grid-cols-2 gap-2.5">
              {kpis.map(([k, v]) => {
                const score = Math.round(Number(v ?? 0));
                const t = tone(k === "operational_risk" ? 100 - score : score);
                return (
                  <li key={k} className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <div className="text-[11px] text-muted-foreground truncate">
                      {KPI_LABELS[k]}
                    </div>
                    <div className={cn("font-display text-lg font-semibold tabular-nums", t.text)}>
                      {score}
                      <span className="text-[10px] font-normal text-muted-foreground">/100</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </div>

      {compliance.length > 0 && (
        <Panel
          className="lg:col-span-2"
          title="Compliance readiness"
          description="Framework-by-framework readiness and what is still missing"
          icon={ShieldCheck}
        >
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {compliance.map((c, i) => {
              const readiness = Math.round(Number(c.readiness ?? 0));
              const t = tone(readiness);
              return (
                <li key={`${c.framework}-${i}`} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{c.framework ?? "—"}</span>
                    <span className={cn("text-sm tabular-nums font-semibold", t.text)}>
                      {readiness}%
                    </span>
                  </div>
                  <Progress value={readiness} className="mt-2 h-1.5" />
                  {(c.missing ?? []).length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {(c.missing ?? []).slice(0, 4).map((m, j) => (
                        <li key={j} className="text-[11px] text-muted-foreground">
                          • {m}
                        </li>
                      ))}
                    </ul>
                  )}
                  {c.recommendation && (
                    <p className="mt-2 text-[11px] text-muted-foreground">{c.recommendation}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}

/**
 * Severity cards for the executive summary. Each card is clickable and opens
 * a drill-down with the exact findings — inline previews are capped so a run
 * with many warnings never dumps everything into one bubble.
 */
export function AuditSeverityCards({
  report,
  passed,
  warnings,
  critical,
}: {
  report: AuditReportShape;
  passed: number;
  warnings: number;
  critical: number;
}) {
  const [open, setOpen] = useState<Severity | null>(null);

  const findings: Record<Severity, AuditFinding[]> = {
    passed: [...(report.strengths ?? []), ...(report.opportunities ?? [])],
    warning: report.warnings ?? [],
    critical: report.critical ?? [],
  };

  const cards: Array<{
    key: Severity;
    label: string;
    count: number;
    icon: typeof CheckCircle2;
    cls: string;
  }> = [
    {
      key: "passed",
      label: "Passed",
      count: passed,
      icon: CheckCircle2,
      cls: "text-[color:var(--success)]",
    },
    {
      key: "warning",
      label: "Warnings",
      count: warnings,
      icon: AlertTriangle,
      cls: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "critical",
      label: "Critical",
      count: critical,
      icon: ShieldCheck,
      cls: "text-destructive",
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const list = findings[c.key];
          const limit = INLINE_LIMIT[c.key];
          const preview = c.count > limit ? [] : list.slice(0, 2);
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setOpen(c.key)}
              className="oq-lift rounded-lg border border-border bg-muted/20 p-3 text-left transition-colors hover:bg-accent/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Icon className={cn("h-3.5 w-3.5", c.cls)} />
                  {c.label}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                {c.count}
              </div>
              {preview.length > 0 ? (
                <ul className="mt-1.5 space-y-0.5">
                  {preview.map((f, i) => (
                    <li key={i} className="truncate text-[11px] text-muted-foreground">
                      • {f.title ?? f.description ?? "Finding"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {list.length > 0
                    ? `${list.length} detailed finding${list.length === 1 ? "" : "s"} — open to read`
                    : "No detail recorded"}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <Sheet open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {open === "critical"
                ? "Critical findings"
                : open === "warning"
                  ? "Warnings"
                  : "Passed checks & opportunities"}
            </SheetTitle>
            <SheetDescription>
              Exactly what the audit observed, why it matters and the recommended remedy.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-8">
            {(open ? findings[open] : []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This run recorded no narrative detail for this severity.
              </p>
            ) : (
              (open ? findings[open] : []).map((f, i) => (
                <article key={i} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium leading-snug">
                      {f.title ?? `Finding ${i + 1}`}
                    </h3>
                    {f.priority && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {f.priority}
                      </Badge>
                    )}
                  </div>
                  {f.description && (
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {f.description}
                    </p>
                  )}
                  <dl className="mt-2 space-y-1 text-[11px]">
                    {f.impact && (
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 text-muted-foreground">Impact</dt>
                        <dd className="text-foreground/90">{f.impact}</dd>
                      </div>
                    )}
                    {f.risk && (
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 text-muted-foreground">Risk</dt>
                        <dd className="text-foreground/90">{f.risk}</dd>
                      </div>
                    )}
                    {f.recommendation && (
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 text-muted-foreground">Remedy</dt>
                        <dd className="text-foreground/90">{f.recommendation}</dd>
                      </div>
                    )}
                  </dl>
                </article>
              ))
            )}

            {open === "critical" && (report.riskMatrix ?? []).length > 0 && (
              <section className="rounded-lg border border-border p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Risk matrix
                </h3>
                <ul className="mt-2 space-y-2">
                  {(report.riskMatrix ?? []).map((r, i) => (
                    <li key={i} className="text-[11px]">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {r.severity ?? "—"}
                        </Badge>
                        <span className="font-medium text-foreground">{r.risk ?? "—"}</span>
                      </div>
                      {r.mitigation && (
                        <p className="mt-0.5 text-muted-foreground">{r.mitigation}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          <div className="px-4 pb-6">
            <Button variant="outline" size="sm" onClick={() => setOpen(null)}>
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
