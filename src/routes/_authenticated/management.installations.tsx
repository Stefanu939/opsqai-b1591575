import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listInstallations } from "@/lib/releases.functions";
import { listSelfHostFleet, type SelfHostFleetRow } from "@/lib/selfhost-fleet.functions";
import {
  statusBadgeVariant,
  statusLabel,
  DISPLAY_STATUSES,
  deriveInstallationStatus,
} from "@/lib/selfhost-status";
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
import { Package, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/management/installations")({
  head: () => ({
    meta: [
      { title: "Installations — Management Center" },
      {
        name: "description",
        content:
          "Registered self-hosted OPSQAI installations with live heartbeat telemetry, license state and module coverage.",
      },
    ],
  }),
  component: InstallationsPage,
});

type LicenseInstallRow = {
  install_id: string;
  last_heartbeat_at: string | null;
  app_version: string | null;
  installer_version: string | null;
  user_count: number | null;
  ip_address: string | null;
  license: {
    company_name: string;
    tier: string | null;
    seats: number | null;
    revoked: boolean;
    suspended: boolean;
    expires_at: string | null;
  } | null;
};

/** One row per installation, merged from license bookkeeping + heartbeat telemetry. */
type Row = {
  install_id: string;
  organization_name: string | null;
  country: string | null;
  primary_language: string | null;
  enabled_modules: string[];
  license_status: string | null;
  tier: string | null;
  seats: number | null;
  user_count: number | null;
  app_version: string | null;
  installer_version: string | null;
  last_heartbeat_at: string | null;
  last_maintenance_at: string | null;
  next_maintenance_at: string | null;
  display_status: SelfHostFleetRow["display_status"];
};

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

function mergeRows(installs: LicenseInstallRow[], fleet: SelfHostFleetRow[]): Row[] {
  const now = Date.now();
  const byId = new Map<string, Row>();

  for (const f of fleet) {
    byId.set(f.install_id, {
      install_id: f.install_id,
      organization_name: f.organization_name,
      country: f.country,
      primary_language: f.primary_language,
      enabled_modules: f.enabled_modules,
      license_status: f.license_status,
      tier: null,
      seats: null,
      user_count: null,
      app_version: f.app_version,
      installer_version: null,
      last_heartbeat_at: f.last_heartbeat_at,
      last_maintenance_at: f.last_maintenance_at,
      next_maintenance_at: f.next_maintenance_at,
      display_status: f.display_status,
    });
  }

  for (const i of installs) {
    const licenseStatus = i.license?.revoked
      ? "revoked"
      : i.license?.suspended
        ? "suspended"
        : (byId.get(i.install_id)?.license_status ?? "active");
    const existing = byId.get(i.install_id);
    const lastHeartbeat = existing?.last_heartbeat_at ?? i.last_heartbeat_at;
    byId.set(i.install_id, {
      install_id: i.install_id,
      organization_name: existing?.organization_name ?? i.license?.company_name ?? null,
      country: existing?.country ?? null,
      primary_language: existing?.primary_language ?? null,
      enabled_modules: existing?.enabled_modules ?? [],
      license_status: licenseStatus,
      tier: i.license?.tier ?? null,
      seats: i.license?.seats ?? null,
      user_count: i.user_count ?? null,
      app_version: existing?.app_version ?? i.app_version,
      installer_version: i.installer_version,
      last_heartbeat_at: lastHeartbeat,
      last_maintenance_at: existing?.last_maintenance_at ?? null,
      next_maintenance_at: existing?.next_maintenance_at ?? null,
      display_status:
        existing?.display_status ??
        deriveInstallationStatus({
          lastHeartbeatAt: lastHeartbeat,
          reportedStatus: null,
          now,
        }),
    });
  }

  return Array.from(byId.values()).sort((a, b) => {
    const at = a.last_heartbeat_at ? new Date(a.last_heartbeat_at).getTime() : 0;
    const bt = b.last_heartbeat_at ? new Date(b.last_heartbeat_at).getTime() : 0;
    return bt - at;
  });
}

function InstallationsPage() {
  const listInstalls = useServerFn(listInstallations);
  const listFleet = useServerFn(listSelfHostFleet);

  const installsQuery = useQuery({
    queryKey: ["mc-installations"],
    queryFn: () => listInstalls({ data: {} } as never) as Promise<LicenseInstallRow[]>,
    refetchInterval: 30000,
  });
  const fleetQuery = useQuery({
    queryKey: ["mc-selfhost-fleet"],
    queryFn: () => listFleet({ data: {} } as never) as Promise<SelfHostFleetRow[]>,
    refetchInterval: 30000,
  });

  const data = useMemo(
    () => mergeRows(installsQuery.data ?? [], fleetQuery.data ?? []),
    [installsQuery.data, fleetQuery.data],
  );

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

  const online = data.filter((r) => r.display_status === "online").length;

  const columns: Column<Row>[] = [
    {
      key: "org",
      header: "Installation",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{r.organization_name ?? "—"}</span>
          <span className="font-mono text-xs text-muted-foreground">{r.install_id}</span>
        </div>
      ),
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
      key: "license",
      header: "License",
      render: (r) => (
        <div className="flex flex-col gap-1 text-xs">
          <Badge variant="outline">{r.license_status ?? "—"}</Badge>
          <span className="text-muted-foreground">{r.tier ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "region",
      header: "Country / Language",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.country ?? "—"} · {r.primary_language ?? "—"}
        </span>
      ),
    },
    {
      key: "version",
      header: "App / Installer",
      render: (r) => (
        <div className="flex flex-col font-mono text-xs">
          <span>{r.app_version ?? "—"}</span>
          <span className="text-muted-foreground">{r.installer_version ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "users",
      header: "Users",
      align: "right",
      render: (r) => (
        <span className="tabular-nums">
          {r.user_count ?? 0}
          <span className="text-muted-foreground"> / {r.seats ?? "—"}</span>
        </span>
      ),
    },
    {
      key: "heartbeat",
      header: "Last heartbeat",
      render: (r) => (
        <span className="text-xs text-muted-foreground">{relativeTime(r.last_heartbeat_at)}</span>
      ),
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
            Next:{" "}
            {r.next_maintenance_at
              ? new Date(r.next_maintenance_at).toLocaleDateString()
              : "—"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <Link
          to="/management/licenses"
          search={{ install: r.install_id }}
          className="text-xs text-foreground underline underline-offset-4 hover:no-underline"
        >
          License →
        </Link>
      ),
    },
  ];

  return (
    <ModulePage
      eyebrow="Management Center"
      title="Installations"
      description="Every self-hosted OPSQAI installation: license state, heartbeat telemetry, versions and module coverage. Visibility only — no remote control actions."
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
          <SelectTrigger className="h-9 w-[170px]">
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
          <span className="tabular-nums">{online}</span> online ·{" "}
          <span className="tabular-nums">{rows.length}</span> / {data.length}
        </div>
      </div>

      <DataTable<Row>
        columns={columns}
        rows={rows}
        rowKey={(r) => r.install_id}
        loading={installsQuery.isLoading || fleetQuery.isLoading}
        empty={{
          icon: Package,
          title: data.length ? "No matches" : "No installations yet",
          description: data.length
            ? "Adjust filters to see more results."
            : "Installations appear here after an installer has phoned home with its first heartbeat.",
        }}
      />
    </ModulePage>
  );
}
