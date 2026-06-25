import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getKnowledgeAnalytics } from "@/lib/analytics.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, FileText, ThumbsDown, ThumbsUp, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/analytics")({
  head: () => ({ meta: [{ title: "Knowledge Analytics — OPSQAI" }] }),
  component: Page,
});

type Data = Awaited<ReturnType<typeof getKnowledgeAnalytics>>;

function Page() {
  const fn = useServerFn(getKnowledgeAnalytics);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => { fn().then(setData).catch(console.error); }, []);

  if (!data) return <div className="flex-1 p-8 text-sm text-muted-foreground">Loading analytics…</div>;

  const exportCsv = () => {
    const lines: string[] = [];
    lines.push("Metric,Value");
    lines.push(`Total questions (30d),${data.totalQuestions}`);
    lines.push(`Active SOPs,${data.totalDocs}`);
    lines.push(`FAQs,${data.totalFaqs}`);
    lines.push(`Avg AI confidence,${(data.avgConfidence * 100).toFixed(1)}%`);
    lines.push(`Low-confidence answers,${data.lowConfidenceCount}`);
    lines.push(`Open knowledge gaps,${data.openGaps.length}`);
    lines.push(`Unanswered occurrences,${data.unansweredCount}`);
    lines.push("");
    lines.push("Top questions,Count");
    for (const [q, c] of data.topQuestions) lines.push(`"${q.replace(/"/g, '""')}",${c}`);
    lines.push("");
    lines.push("Most used SOPs,Count");
    for (const d of data.topDocs) lines.push(`"${d.title.replace(/"/g, '""')}",${d.count}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `opsqai-analytics-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>OPSQAI Analytics</title>
      <style>body{font-family:system-ui;max-width:780px;margin:24px auto;padding:0 24px;color:#111}h1{font-size:22px}h2{font-size:14px;margin-top:24px;text-transform:uppercase;color:#666;letter-spacing:.05em}table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:6px 8px;border-bottom:1px solid #eee;text-align:left}</style></head><body>
      <h1>OPSQAI Knowledge Analytics</h1>
      <p>Generated ${new Date().toLocaleString()}</p>
      <h2>Overview</h2>
      <table><tr><td>Total questions (30d)</td><td>${data.totalQuestions}</td></tr>
      <tr><td>Active SOPs</td><td>${data.totalDocs}</td></tr>
      <tr><td>FAQs</td><td>${data.totalFaqs}</td></tr>
      <tr><td>Avg AI confidence</td><td>${(data.avgConfidence * 100).toFixed(1)}%</td></tr>
      <tr><td>Low-confidence answers</td><td>${data.lowConfidenceCount}</td></tr>
      <tr><td>Open knowledge gaps</td><td>${data.openGaps.length}</td></tr></table>
      <h2>Top questions</h2><table>${data.topQuestions.map(([q, c]) => `<tr><td>${q}</td><td>${c}</td></tr>`).join("")}</table>
      <h2>Most used SOPs</h2><table>${data.topDocs.map((d) => `<tr><td>${d.title}</td><td>${d.count}</td></tr>`).join("")}</table>
      <h2>Outdated SOPs (>6 months)</h2><table>${data.outdatedSops.map((d) => `<tr><td>${d.doc_code ?? ""}</td><td>${d.title}</td><td>${new Date(d.updated_at).toLocaleDateString()}</td></tr>`).join("") || "<tr><td>None</td></tr>"}</table>
      <script>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Last 30 days · live data.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportPdf}><FileText className="h-3.5 w-3.5 mr-1.5" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total questions" value={data.totalQuestions} />
        <Kpi label="Active SOPs" value={data.totalDocs} />
        <Kpi label="FAQs" value={data.totalFaqs} />
        <Kpi label="Avg confidence" value={`${(data.avgConfidence * 100).toFixed(0)}%`} />
        <Kpi label="Low-confidence" value={data.lowConfidenceCount} tone="warn" />
        <Kpi label="Open gaps" value={data.openGaps.length} tone="warn" />
        <Kpi label="Unanswered" value={data.unansweredCount} tone="warn" />
        <Kpi label="Outdated SOPs" value={data.outdatedSops.length} tone="warn" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Top questions">
          {data.topQuestions.length === 0 ? <Empty /> : data.topQuestions.map(([q, c]) => (
            <Row key={q} label={q} value={c} />
          ))}
        </Section>
        <Section title="Most used SOPs">
          {data.topDocs.length === 0 ? <Empty /> : data.topDocs.map((d) => (
            <Row key={d.id} label={d.title} value={d.count} />
          ))}
        </Section>
        <Section title="Most used FAQs">
          {data.topFaqs.length === 0 ? <Empty /> : data.topFaqs.map((d) => (
            <Row key={d.id} label={d.title} value={d.count} />
          ))}
        </Section>
        <Section title="Outdated SOPs (>6 months)">
          {data.outdatedSops.length === 0 ? <Empty /> : data.outdatedSops.map((d) => (
            <Row key={d.id} label={`${d.doc_code ? d.doc_code + " · " : ""}${d.title}`} value={new Date(d.updated_at).toLocaleDateString()} />
          ))}
        </Section>
      </div>

      <Section title="Feedback">
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-emerald-600" /><span className="font-semibold">{data.positive}</span><span className="text-muted-foreground">helpful</span></div>
          <div className="flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-destructive" /><span className="font-semibold">{data.negative}</span><span className="text-muted-foreground">not helpful</span></div>
        </div>
      </Section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number | string; tone?: "warn" }) {
  return (
    <Card className="p-4">
      <div className={`text-2xl font-bold ${tone === "warn" && Number(value) > 0 ? "text-amber-600" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </Card>
  );
}
function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="truncate text-foreground/90">{label}</span>
      <Badge variant="outline" className="font-mono text-[10px] shrink-0">{value}</Badge>
    </div>
  );
}
function Empty() { return <div className="text-xs text-muted-foreground">No data yet.</div>; }
