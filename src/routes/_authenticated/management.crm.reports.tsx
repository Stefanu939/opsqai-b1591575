import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { Button } from "@/components/ui/button";
import { downloadBase64 } from "@/components/app/transport/download";
import { crmReports, exportCrmReportPdf } from "@/lib/crm.functions";
import { STAGE_LABELS } from "@/components/mc/crm/pipeline-board";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/management/crm/reports")({
  head: () => ({
    meta: [
      { title: "CRM reports — OPSQAI Management Center" },
      {
        name: "description",
        content:
          "Pipeline value, conversion rate, leads by source, country and language, and stalled leads.",
      },
      { property: "og:title", content: "CRM reports — OPSQAI" },
      { property: "og:description", content: "Pipeline and conversion reporting for OPSQAI sales." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function Bars({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="w-28 truncate text-xs text-muted-foreground">
              {STAGE_LABELS[r.label] ?? r.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs font-semibold text-foreground">{r.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportsPage() {
  const { session, loading } = useAuth();
  const load = useServerFn(crmReports);
  const pdf = useServerFn(exportCrmReportPdf);

  const { data, isLoading } = useQuery({
    queryKey: ["crm-reports", session?.user?.id ?? null],
    queryFn: () => load({ data: {} } as never),
    enabled: !loading && Boolean(session?.user?.id),
    retry: false,
  });

  return (
    <ModulePage
      eyebrow="CRM"
      title="Reports"
      description="Pipeline, conversion and lead sources."
      actions={
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/management/crm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Pipeline
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={() =>
              void pdf({ data: {} } as never)
                .then((res) => downloadBase64(res.filename, res.base64))
                .catch((e: Error) => toast.error(e.message))
            }
          >
            <Download className="mr-1.5 h-4 w-4" />
            PDF
          </Button>
        </div>
      }
    >
      {isLoading || !data ? (
        <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Leads", String(data.total)],
              ["Won", String(data.won)],
              ["Conversion", `${data.conversion}%`],
              ["Open value", `${data.openValue.toLocaleString()} EUR`],
              ["Stalled >14d", String(data.staleCount)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {label}
                </div>
                <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Bars title="By stage" rows={data.byStage} />
            <Bars title="By source" rows={data.bySource} />
            <Bars title="By country" rows={data.byCountry} />
            <Bars title="By language" rows={data.byLanguage} />
          </div>
        </>
      )}
    </ModulePage>
  );
}
