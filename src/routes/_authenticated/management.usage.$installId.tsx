// Management Center → external usage audit for one self-hosted installation.
//
// Deliberately numbers-only: everything on this screen comes from aggregate
// counters the installation reports. There is no way to reach customer
// content from here, because the installation never sends any.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  getUsageAudit,
  exportUsageAuditPdf,
  USAGE_METRIC_LABELS,
  type UsageAudit,
} from "@/lib/usage-audit.functions";
import { ModulePage } from "@/components/app/module-page";
import { MetricTile } from "@/components/ui/metric-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Download, Minus, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/management/usage/$installId")({
  head: () => ({
    meta: [
      { title: "Usage audit — Management Center" },
      {
        name: "description",
        content:
          "Aggregate usage audit for a self-hosted OPSQAI installation: adoption, time in app, AI usage, deadlines and availability — without any customer data.",
      },
    ],
  }),
  component: UsageAuditPage,
});

type MetricRow = { key: string; label: string; now: number | null; start: number | null };

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
}

function MetricCard({ row: r }: { row: MetricRow }) {
  const delta =
    r.now != null && r.start != null ? Math.round((r.now - r.start) * 100) / 100 : null;
  const max = Math.max(r.now ?? 0, r.start ?? 0, 1);
  const nowPct = r.now != null ? Math.max(4, Math.round((r.now / max) * 100)) : 0;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{r.label}</span>
        {delta == null ? null : delta > 0 ? (
          <Badge variant="outline" className="gap-1 text-[10px] text-emerald-500">
            <TrendingUp className="h-3 w-3" />+{delta}
          </Badge>
        ) : delta < 0 ? (
          <Badge variant="outline" className="gap-1 text-[10px] text-amber-500">
            <TrendingDown className="h-3 w-3" />
            {delta}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
            <Minus className="h-3 w-3" />0
          </Badge>
        )}
      </div>
      <div className="text-2xl font-bold tabular-nums text-foreground">{fmt(r.now)}</div>
      <div className="space-y-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              delta != null && delta < 0 ? "bg-amber-500/70" : "bg-primary/70",
            )}
            style={{ width: `${nowPct}%` }}
          />
        </div>
        <div className="text-[11px] text-muted-foreground">
          Start of range: <span className="tabular-nums">{fmt(r.start)}</span>
        </div>
      </div>
    </div>
  );
}

function UsageAuditPage() {
  const { installId } = Route.useParams();
  const [days, setDays] = useState("90");
  const fetchAudit = useServerFn(getUsageAudit);
  const exportPdf = useServerFn(exportUsageAuditPdf);
  const [exporting, setExporting] = useState(false);

  const query = useQuery({
    queryKey: ["mc-usage-audit", installId, days],
    queryFn: () =>
      fetchAudit({ data: { installId, days: Number(days) } }) as Promise<UsageAudit>,
    refetchInterval: 60_000,
  });
  const audit = query.data;

  const rows = useMemo<MetricRow[]>(
    () =>
      USAGE_METRIC_LABELS.map(([key, label]) => ({
        key,
        label,
        now: audit?.latest?.[key] ?? null,
        start: audit?.baseline?.[key] ?? null,
      })),
    [audit],
  );

  const onExport = async () => {
    setExporting(true);
    try {
      const res = (await exportPdf({ data: { installId, days: Number(days) } })) as {
        filename: string;
        base64: string;
      };
      const bin = atob(res.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <ModulePage
      eyebrow="Management Center"
      title="Usage audit"
      description="How much and how the installation is used, measured from aggregate counters only. No customer documents, names, messages or personal data are transmitted or shown."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <Button asChild size="sm" variant="ghost">
          <Link to="/management/installations">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Installations
          </Link>
        </Button>
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Numbers only
        </Badge>
        <div className="min-w-0">
          {audit?.organization_name ? (
            <span className="block truncate text-sm font-medium text-foreground">
              {audit.organization_name}
            </span>
          ) : null}
          <span className="block truncate font-mono text-[11px] text-muted-foreground">
            {installId}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 180 days</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={onExport} disabled={exporting}>
            <Download className="mr-1.5 h-4 w-4" />
            {exporting ? "Preparing…" : "Export PDF"}
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Active users (30d)" value={fmt(audit?.latest?.["users_active_30d"])} />
        <MetricTile label="Sessions (30d)" value={fmt(audit?.latest?.["sessions_30d"])} />
        <MetricTile
          label="Minutes in app (30d)"
          value={fmt(audit?.latest?.["session_minutes_30d"])}
        />
        <MetricTile label="AI questions (30d)" value={fmt(audit?.latest?.["ai_questions_30d"])} />
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : !audit?.reporting ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <p>
            This installation has not reported usage figures yet.
            {audit?.last_heartbeat_at
              ? " It is reachable and reports its state, but no usage numbers have arrived."
              : " No report of any kind has arrived yet."}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Usage reporting was added in app version 1.1.0
              {audit?.app_version ? ` — this installation runs ${audit.app_version}.` : "."} Older
              installations send status only; the numbers appear after the update.
            </li>
            <li>Nothing is reported when the customer set telemetry to disabled.</li>
            <li>Numbers are stored at most once every 6 hours per installation.</li>
          </ul>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => (
              <MetricCard key={r.key} row={r} />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {audit.snapshots.length} reports in range · last report{" "}
            {audit.last_heartbeat_at
              ? audit.last_heartbeat_at.slice(0, 16).replace("T", " ")
              : "—"}
            {audit.license_expires_at
              ? ` · license valid until ${audit.license_expires_at.slice(0, 10)}`
              : ""}
          </p>
        </>
      )}
    </ModulePage>
  );
}
