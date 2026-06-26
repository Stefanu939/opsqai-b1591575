import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runWorkspaceAudit, listAiAudits } from "@/lib/ai-features.functions";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, Loader2, Download, AlertTriangle, ShieldCheck, Lightbulb, ListChecks } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/admin/ai-audit")({ component: AiAuditPage });

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

  const load = async () => { try { const r = await list(); setAudits(r.audits); if (!current && r.audits[0]) setCurrent(r.audits[0]); } catch { /* ignore */ } };
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

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-medium">Governance</p>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /> AI Workspace Audit</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-driven compliance and operational maturity review.</p>
        </div>
        <div className="flex gap-2">
          {current && <Button variant="outline" size="sm" onClick={onExport}><Download className="h-4 w-4 mr-1" /> Export JSON</Button>}
          {current && <Button variant="outline" size="sm" onClick={onPrint}>Save as PDF</Button>}
          <Button onClick={onRun} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-1" />} Run AI Audit</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card className="card-enterprise border-0 p-5 lg:col-span-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">History</div>
          {audits.length === 0 ? (
            <div className="text-sm text-muted-foreground">No audits yet.</div>
          ) : (
            <ul className="space-y-1.5 max-h-[480px] overflow-y-auto">
              {audits.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => setCurrent(a)}
                    className={`w-full text-left text-xs rounded-md px-2 py-2 border ${current?.id === a.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                  >
                    <div className="flex justify-between"><span>{new Date(a.created_at).toLocaleString()}</span><span className="font-mono">{Math.round(a.score)}</span></div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 capitalize">{a.maturity}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:col-span-3 space-y-4">
          {!current ? (
            <Card className="card-enterprise border-0 p-10 text-center text-sm text-muted-foreground">
              Run your first audit to generate a report.
            </Card>
          ) : (
            <>
              <Card className="card-enterprise border-0 p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Overall maturity</div>
                    <div className="text-4xl font-semibold tabular-nums">{Math.round(current.score)}/100</div>
                    <Badge variant="secondary" className="mt-1 capitalize">{current.maturity}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><div className="text-2xl font-semibold text-emerald-500">{current.passed}</div><div className="text-[10px] uppercase text-muted-foreground">Passed</div></div>
                    <div><div className="text-2xl font-semibold text-amber-500">{current.warnings}</div><div className="text-[10px] uppercase text-muted-foreground">Warnings</div></div>
                    <div><div className="text-2xl font-semibold text-red-500">{current.critical}</div><div className="text-[10px] uppercase text-muted-foreground">Critical</div></div>
                  </div>
                </div>
                <Progress value={current.score} className="h-2 mt-4" />
                <p className="text-sm mt-3">{summary.executiveSummary}</p>
              </Card>

              <Card className="card-enterprise border-0 p-5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5" /> Risks</div>
                <List items={summary.risks} empty="No notable risks." />
              </Card>
              <Card className="card-enterprise border-0 p-5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-2"><Lightbulb className="h-3.5 w-3.5" /> Recommendations</div>
                <List items={summary.recommendations} empty="No recommendations." />
              </Card>
              <Card className="card-enterprise border-0 p-5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-2"><ListChecks className="h-3.5 w-3.5" /> Priority actions</div>
                <List items={summary.priorityActions} empty="No priority actions." />
              </Card>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" /> Audit ID {current.id} · generated {new Date(current.created_at).toLocaleString()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function List({ items, empty }: { items?: string[]; empty: string }) {
  if (!items || items.length === 0) return <div className="text-sm text-muted-foreground">{empty}</div>;
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((s, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" /><span>{s}</span></li>)}
    </ul>
  );
}
