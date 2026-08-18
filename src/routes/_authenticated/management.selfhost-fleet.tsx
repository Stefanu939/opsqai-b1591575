import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listSelfHostFleet, type SelfHostFleetRow } from "@/lib/selfhost-fleet.functions";
import { statusBadgeVariant, statusLabel, DISPLAY_STATUSES } from "@/lib/selfhost-status";
import { ModulePage } from "@/components/app/module-page";
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
import { Radio, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/management/selfhost-fleet")({
  head: () => ({ meta: [{ title: "Self-Hosted Fleet — Management Center" }] }),
  component: SelfHostFleetPage,
});

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function SelfHostFleetPage() {
  const list = useServerFn(listSelfHostFleet);
  const { data = [], isLoading } = useQuery({
    queryKey: ["mc-selfhost-fleet"],
    queryFn: () => list({ data: {} } as never) as Promise<SelfHostFleetRow[]>,
    refetchInterval: 30000,
  });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [country, setCountry] = useState("all");
  const [version, setVersion] = useState("all");
  const [licenseStatus, setLicenseStatus] = useState("all");

  const countries = useMemo(
    () => Array.from(new Set(data.map((r) => r.country).filter(Boolean))) as string[],
    [data],
  );
  const versions = useMemo(
    () => Array.from(new Set(data.map((r) => r.app_version).filter(Boolean))) as string[],
    [data],
  );
  const licenseStatuses = useMemo(
    () => Array.from(new Set(data.map((r) => r.license_status).filter(Boolean))) as string[],
    [data],
  );

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return data.filter((r) => {
      if (query) {
        const hay = `${r.install_id} ${r.organization_name ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (status !== "all" && r.display_status !== status) return false;
      if (country !== "all" && r.country !== country) return false;
      if (version !== "all" && r.app_version !== version) return false;
      if (licenseStatus !== "all" && r.license_status !== licenseStatus) return false;
      return true;
    });
  }, [data, q, status, country, version, licenseStatus]);

  const columns: Column<SelfHostFleetRow>[] = [
    {
      key: "org",
      header: "Organization",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{r.organization_name ?? "—"}</span>
          <span className="font-mono text-xs text-muted-foreground">{r.install_id}</span>
        </div>
      ),
    },
    {
      key: "country",
      header: "Country",
      render: (r) => <span className="text-xs">{r.country ?? "—"}</span>,
    },
    {
      key: "language",
      header: "Language",
      render: (r) => <span className="text-xs">{r.primary_language ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant={statusBadgeVariant(r.display_status)}>
          {statusLabel(r.display_status)}
        </Badge>
      ),
    },
    {
      key: "version",
      header: "Version",
      render: (r) => <span className="font-mono text-xs">{r.app_version ?? "—"}</span>,
    },
    {
      key: "heartbeat",
      header: "Last heartbeat",
      render: (r) => (
        <span className="text-xs text-muted-foreground">{relativeTime(r.last_heartbeat_at)}</span>
      ),
    },
    {
      key: "license",
      header: "License",
      render: (r) => <Badge variant="outline">{r.license_status ?? "—"}</Badge>,
    },
    {
      key: "modules",
      header: "Modules",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.enabled_modules.length ? r.enabled_modules.join(", ") : "—"}
        </span>
      ),
    },
    {
      key: "maintenance",
      header: "Maintenance",
      render: (r) => (
        <div className="flex flex-col text-xs text-muted-foreground">
          <span>Last: {r.last_maintenance_at ? relativeTime(r.last_maintenance_at) : "—"}</span>
          <span>
            Next: {r.next_maintenance_at ? new Date(r.next_maintenance_at).toLocaleDateString() : "—"}
          </span>
        </div>
      ),
    },
  ];

  return (
    <ModulePage
      eyebrow="Management Center"
      title="Self-Hosted Fleet"
      description="Visibility-only view of self-hosted installations reporting heartbeats. No remote control actions."
    >
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by install_id or organization…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {DISPLAY_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={version} onValueChange={setVersion}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Version" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All versions</SelectItem>
            {versions.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={licenseStatus} onValueChange={setLicenseStatus}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="License status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All license statuses</SelectItem>
            {licenseStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          <span className="tabular-nums">{rows.length}</span> / {data.length}
        </div>
      </div>

      <DataTable<SelfHostFleetRow>
        columns={columns}
        rows={rows}
        rowKey={(r) => r.install_id}
        loading={isLoading}
        empty={{
          icon: Radio,
          title: data.length ? "No matches" : "No heartbeats yet",
          description: data.length
            ? "Adjust filters to see more results."
            : "Installations appear here after they send their first heartbeat.",
        }}
      />
    </ModulePage>
  );
}
