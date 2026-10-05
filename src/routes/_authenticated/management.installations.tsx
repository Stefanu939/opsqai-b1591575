import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listInstallations, listReleases } from "@/lib/releases.functions";
import { listSelfHostFleet, type SelfHostFleetRow } from "@/lib/selfhost-fleet.functions";
import {
  statusBadgeVariant,
  statusLabel,
  DISPLAY_STATUSES,
  deriveInstallationStatus,
} from "@/lib/selfhost-status";
import { ModulePage } from "@/components/app/module-page";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  ArrowRight,
  Globe,
  KeyRound,
  Package,
  Search,
  Server,
  Users,
  Wrench,
} from "lucide-react";
import { MetricTile } from "@/components/ui/metric-tile";
import { cn } from "@/lib/utils";

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

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  degraded: "bg-amber-500",
  offline: "bg-red-500",
  unknown: "bg-muted-foreground/40",
};

function InstallationCard({ row: r, currentVersion }: { row: Row; currentVersion: string | null }) {
  const isOutdated = Boolean(currentVersion && r.app_version && r.app_version !== currentVersion);
  const dot = STATUS_DOT[r.display_status] ?? STATUS_DOT.unknown;

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
      <div className="flex items-start gap-3 p-4 pb-3">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Server className="h-5 w-5" />
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card",
              dot,
            )}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-foreground">
            {r.organization_name ?? "Unnamed installation"}
          </div>
          <div className="truncate font-mono text-[11px] text-muted-foreground">
            {r.install_id}
          </div>
        </div>
        <Badge variant={statusBadgeVariant(r.display_status)}>{statusLabel(r.display_status)}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/60 px-4 py-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Activity className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{relativeTime(r.last_heartbeat_at)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Globe className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {r.country ?? "—"} · {r.primary_language ?? "—"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="tabular-nums">
            {r.user_count ?? 0} / {r.seats ?? "—"} seats
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {r.license_status ?? "—"}
            {r.tier ? ` · ${r.tier}` : ""}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
        <Badge variant="outline" className="font-mono text-[10px]">
          v{r.app_version ?? "?"}
        </Badge>
        {isOutdated ? (
          <Badge variant="outline" className="text-[10px] text-amber-500">
            outdated → {currentVersion}
          </Badge>
        ) : null}
        {r.enabled_modules.map((m) => (
          <Badge key={m} variant="secondary" className="text-[10px]">
            {m}
          </Badge>
        ))}
      </div>

      {r.next_maintenance_at ? (
        <div className="flex items-center gap-1.5 px-4 pb-3 text-[11px] text-muted-foreground">
          <Wrench className="h-3 w-3" />
          Next maintenance {new Date(r.next_maintenance_at).toLocaleDateString()}
        </div>
      ) : null}

      <div className="mt-auto flex items-center gap-2 border-t border-border/60 p-3">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link to="/management/usage/$installId" params={{ installId: r.install_id }}>
            Usage audit
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost" className="flex-1">
          <Link to="/management/licenses" search={{ install: r.install_id }}>
            License
          </Link>
        </Button>
      </div>
    </div>
  );
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

  const releasesFn = useServerFn(listReleases);
  const releasesQuery = useQuery({
    queryKey: ["mc-releases-current"],
    queryFn: () => releasesFn({ data: {} } as never) as Promise<
      Array<{ version: string; is_current: boolean | null; published_at: string | null }>
    >,
    staleTime: 60_000,
  });
  const currentVersion =
    (releasesQuery.data ?? []).find((r) => r.is_current)?.version ??
    (releasesQuery.data ?? [])[0]?.version ??
    null;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [outdatedOnly, setOutdatedOnly] = useState(false);
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
      if (outdatedOnly) {
        if (!currentVersion || !r.app_version || r.app_version === currentVersion) return false;
      }
      return true;
    });
  }, [data, q, status, country, version, licenseStatus, outdatedOnly, currentVersion]);

  const online = data.filter((r) => r.display_status === "online").length;
  const offline = data.filter((r) => r.display_status === "offline").length;
  const never = data.filter((r) => !r.last_heartbeat_at).length;
  const outdated = currentVersion
    ? data.filter((r) => r.app_version && r.app_version !== currentVersion).length
    : 0;

  const loading = installsQuery.isLoading || fleetQuery.isLoading;

  return (
    <ModulePage
      eyebrow="Management Center"
      title="Installations"
      description="Every self-hosted OPSQAI installation: license state, heartbeat telemetry, versions and module coverage. Visibility only — no remote control actions."
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Online"
          value={online}
          icon={Activity}
          tone={online > 0 ? "success" : "default"}
          onClick={() => setStatus(status === "online" ? "all" : "online")}
        />
        <MetricTile
          label="Offline"
          value={offline}
          icon={Server}
          tone={offline > 0 ? "danger" : "default"}
          onClick={() => setStatus(status === "offline" ? "all" : "offline")}
        />
        <MetricTile label="Never reported" value={never} icon={Package} />
        <MetricTile
          label={currentVersion ? `Outdated (current ${currentVersion})` : "Outdated"}
          value={outdated}
          icon={Wrench}
          tone={outdated > 0 ? "warning" : "default"}
          onClick={() => setOutdatedOnly(!outdatedOnly)}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
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
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={outdatedOnly}
            onChange={(e) => setOutdatedOnly(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Outdated only
        </label>
        <div className="ml-auto text-xs text-muted-foreground">
          <span className="tabular-nums">{rows.length}</span> / {data.length} shown
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {data.length
            ? "No installation matches the current filters."
            : "Installations appear here after an installer has phoned home with its first heartbeat."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <InstallationCard key={r.install_id} row={r} currentVersion={currentVersion} />
          ))}
        </div>
      )}
    </ModulePage>
  );
}
