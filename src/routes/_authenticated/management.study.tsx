import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { Button } from "@/components/ui/button";
import { downloadBase64 } from "@/components/app/transport/download";
import { exportStudyReportPdf, getStudyAnalytics } from "@/lib/study.functions";
import { STUDY_COPY, STUDY_QUESTIONS, type StudyQuestionId } from "@/i18n/pages/study";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/management/study")({
  head: () => ({
    meta: [
      { title: "Study results — OPSQAI Management Center" },
      {
        name: "description",
        content: "Aggregated results of the public OPSQAI European Operations Study, with PDF export.",
      },
      { property: "og:title", content: "Study results — OPSQAI" },
      { property: "og:description", content: "Anonymous study responses, distributions and contact interest." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudyResultsPage,
});

const EN = STUDY_COPY.en;

function label(qid: string, opt: string) {
  const q = EN.questions[qid as StudyQuestionId];
  return q?.options[opt] ?? opt;
}

function Bars({ title, rows }: { title: string; rows: Array<{ label: string; count: number }>; }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="w-52 truncate text-xs text-muted-foreground">{r.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right text-xs font-semibold text-foreground">{r.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function StudyResultsPage() {
  const { session, loading } = useAuth();
  const load = useServerFn(getStudyAnalytics);
  const pdf = useServerFn(exportStudyReportPdf);

  const { data, isLoading, error } = useQuery({
    queryKey: ["study-analytics"],
    queryFn: () => load({}),
    enabled: !loading && Boolean(session),
  });

  async function download() {
    try {
      const res = await pdf({});
      downloadBase64(res.filename, res.base64, "application/pdf");
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <ModulePage
      title="Study results"
      description="Aggregated answers from the public European Operations Study. Individual responses stay anonymous."
      actions={
        <Button variant="outline" size="sm" onClick={download}>
          <Download className="mr-2 h-4 w-4" /> PDF
        </Button>
      }
    >
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Could not load study results.</p>}
      {data && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Responses", value: data.total },
              { label: "Left an email", value: data.contacts },
              { label: "Pilot interest", value: data.pilotInterest },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Bars title="By language" rows={data.byLocale} />
            <Bars title="By country" rows={data.byCountry} />
            {STUDY_QUESTIONS.map((q) => {
              const rows = data.byQuestion.find((x) => x.id === q.id)?.rows ?? [];
              return (
                <Bars
                  key={q.id}
                  title={EN.questions[q.id].label}
                  rows={rows.map((r) => ({ label: label(q.id, r.label), count: r.count }))}
                />
              );
            })}
          </div>
        </div>
      )}
    </ModulePage>
  );
}
