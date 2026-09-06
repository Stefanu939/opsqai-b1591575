// Transport Intelligence — runs a data audit over the transport registers and
// shows severity-ranked findings, a score and the run history.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BrainCircuit, Play } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getTransportAuditRuns, runTransportAudit } from "@/lib/transport.functions";
import { downloadText } from "./download";
import type { transportUi } from "@/i18n/pages/transport";
import type { TransportAuditRun } from "@/lib/transport/types";

type Ui = ReturnType<typeof transportUi>;

const SEVERITY: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export function IntelligenceSection({ t }: { t: Ui }) {
  const listFn = useServerFn(getTransportAuditRuns);
  const run = useServerFn(runTransportAudit);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<TransportAuditRun | null>(null);

  const query = useQuery({
    queryKey: ["transport", "audit-runs"],
    queryFn: () => listFn(),
    retry: false,
  });

  const active = current ?? query.data?.runs[0] ?? null;

  const start = () => {
    setBusy(true);
    void run()
      .then((res) => {
        setCurrent(res);
        toast.success(`${t.auditScore}: ${res.score}/100`);
        void query.refetch();
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="grid gap-4">
      <Panel
        icon={BrainCircuit}
        title={t.intelligence}
        description={t.intelligenceBody}
        actions={
          <div className="flex gap-2">
            {active ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadText(
                    `transport-audit-${active.created_at.slice(0, 10)}.csv`,
                    [
                      "severity,area,title,count,detail",
                      ...active.findings.map((f) =>
                        [f.severity, f.area, f.title, f.count, f.detail]
                          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                          .join(","),
                      ),
                    ].join("\n"),
                  )
                }
              >
                {t.export}
              </Button>
            ) : null}
            <Button size="sm" disabled={busy} onClick={start}>
              <Play className="mr-1.5 size-3.5" />
              {t.runAudit}
            </Button>
          </div>
        }
      >
        {query.isPending ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : !active ? (
          <EmptyState title={t.noAudit} description={t.intelligenceBody} />
        ) : (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-lg border border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">{t.auditScore}</p>
                <p className="text-3xl font-semibold">{active.score}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="destructive">
                  {t.critical}: {active.totals.critical ?? 0}
                </Badge>
                <Badge variant="destructive">
                  {t.high}: {active.totals.high ?? 0}
                </Badge>
                <Badge variant="secondary">
                  {t.medium}: {active.totals.medium ?? 0}
                </Badge>
                <Badge variant="outline">
                  {t.low}: {active.totals.low ?? 0}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(active.created_at).toLocaleString()}
                {active.ran_by_name ? ` · ${active.ran_by_name}` : ""}
              </span>
            </div>

            {active.findings.length === 0 ? (
              <EmptyState title={t.noFindings} />
            ) : (
              <ul className="divide-y divide-border">
                {active.findings.map((f) => (
                  <li key={f.key} className="flex flex-wrap items-start gap-3 py-3">
                    <Badge variant={SEVERITY[f.severity] ?? "outline"}>
                      {f.severity === "critical"
                        ? t.critical
                        : f.severity === "high"
                          ? t.high
                          : f.severity === "medium"
                            ? t.medium
                            : t.low}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {f.title} · {f.count}
                      </p>
                      <p className="text-xs text-muted-foreground">{f.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Panel>

      <Panel icon={BrainCircuit} title={t.auditHistory}>
        {!query.data?.runs.length ? (
          <EmptyState title={t.none} />
        ) : (
          <ul className="divide-y divide-border">
            {query.data.runs.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <button
                  type="button"
                  className="text-left text-sm hover:underline"
                  onClick={() => setCurrent(r)}
                >
                  {new Date(r.created_at).toLocaleString()}
                  {r.ran_by_name ? ` · ${r.ran_by_name}` : ""}
                </button>
                <Badge variant={r.score >= 80 ? "outline" : "destructive"}>
                  {r.score}/100
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
