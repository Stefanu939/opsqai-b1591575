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
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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

type Row = { key: string; label: string; now: number | null; start: number | null };

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
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

  const rows = useMemo<Row[]>(
    () =>
      USAGE_METRIC_LABELS.map(([key, label]) => ({
        key,
        label,
        now: audit?.latest?.[key] ?? null,
        start: audit?.baseline?.[key] ?? null,
      })),
    [audit],
  );

  const columns: Column<Row>[] = [
    { key: "label", header: "Indicator", render: (r) => <span>{r.label}</span> },
    {
      key: "now",
      header: "Now",
      align: "right",
      render: (r) => <span className="tabular-nums font-medium">{fmt(r.now)}</span>,
    },
    {
      key: "start",
      header: "Start of range",
      align: "right",
      render: (r) => <span className="tabular-nums text-muted-foreground">{fmt(r.start)}</span>,
    },
    {
      key: "change",
      header: "Change",
      align: "right",
      render: (r) => {
        if (r.now == null || r.start == null) return <span>—</span>;
        const d = Math.round((r.now - r.start) * 100) / 100;
        return (
          <span
            className={
              d > 0 ? "tabular-nums text-emerald-500" : d < 0 ? "tabular-nums text-amber-500" : "tabular-nums text-muted-foreground"
            }
          >
            {d > 0 ? "+" : ""}
            {d}
          </span>
        );
      },
    },
  ];

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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Numbers only
        </Badge>
        <span className="font-mono text-xs text-muted-foreground">{installId}</span>
        {audit?.organization_name ? (
          <span className="text-sm text-foreground">{audit.organization_name}</span>
        ) : null}
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
          <Link
            to="/management/installations"
            className="text-xs text-foreground underline underline-offset-4 hover:no-underline"
          >
            ← Installations
          </Link>
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
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !audit?.reporting ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          This installation has not reported usage figures yet. Reporting starts with the next
          scheduled report, and is skipped entirely when the customer set telemetry to disabled.
        </div>
      ) : (
        <>
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.key} />
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
