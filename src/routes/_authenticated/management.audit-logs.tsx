import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listPlatformAuditLog } from "@/lib/mc-admin.functions";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollText, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/management/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — Management Center" }] }),
  component: AuditLogsPage,
});

type Row = {
  id: string;
  created_at: string;
  user_id: string | null;
  company_id: string | null;
  module: string | null;
  action: string;
  resource: string | null;
  severity: "info" | "warning" | "critical" | null;
  success: boolean | null;
  ip: string | null;
  companies: { name: string } | null;
};

function AuditLogsPage() {
  const list = useServerFn(listPlatformAuditLog);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState<"all" | "info" | "warning" | "critical">("all");
  const [module, setModule] = useState<string>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["mc-audit", severity, module, q],
    queryFn: () =>
      list({
        data: {
          search: q || null,
          severity: severity === "all" ? null : severity,
          module: module === "all" ? null : module,
          limit: 200,
        },
      }) as Promise<Row[]>,
  });

  const modules = Array.from(
    new Set((data as Row[]).map((r) => r.module).filter(Boolean)),
  ) as string[];

  const columns: Column<Row>[] = [
    {
      key: "when",
      header: "When",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {new Date(r.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      render: (r) => (
        <Badge
          variant={
            r.severity === "critical"
              ? "destructive"
              : r.severity === "warning"
                ? "default"
                : "outline"
          }
        >
          {r.severity ?? "info"}
        </Badge>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs">{r.action}</span>
          {r.resource && (
            <span className="text-[11px] text-muted-foreground">{r.resource}</span>
          )}
        </div>
      ),
    },
    {
      key: "module",
      header: "Module",
      render: (r) => <Badge variant="outline">{r.module ?? "—"}</Badge>,
    },
    {
      key: "company",
      header: "Company",
      render: (r) => (
        <span className="text-xs">{r.companies?.name ?? "—"}</span>
      ),
    },
    {
      key: "success",
      header: "Result",
      render: (r) =>
        r.success === false ? (
          <Badge variant="destructive">Failed</Badge>
        ) : (
          <Badge variant="outline">OK</Badge>
        ),
    },
    {
      key: "ip",
      header: "IP",
      render: (r) => (
        <span className="font-mono text-xs text-muted-foreground">{r.ip ?? "—"}</span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Management Center"
        title="Audit Logs"
        description="Every write across every customer, with severity and result."
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search action or resource…"
            className="h-9 pl-8"
          />
        </div>
        <Select
          value={severity}
          onValueChange={(v) => setSeverity(v as typeof severity)}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={module} onValueChange={setModule}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {modules.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          <span className="tabular-nums">{(data as Row[]).length}</span> events
        </div>
      </div>

      <DataTable<Row>
        columns={columns}
        rows={data as Row[]}
        rowKey={(r) => r.id}
        loading={isLoading}
        empty={{
          icon: ScrollText,
          title: "No audit events",
          description: "Actions across the platform will appear here.",
        }}
      />
    </div>
  );
}
