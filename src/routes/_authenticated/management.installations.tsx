import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listInstallations } from "@/lib/releases.functions";
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
import { Package, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/management/installations")({
  head: () => ({ meta: [{ title: "Installations — Management Center" }] }),
  component: InstallationsPage,
});

const ONLINE_MS = 15 * 60 * 1000;

type Row = {
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

function isOnline(r: Row) {
  if (!r.last_heartbeat_at) return false;
  return Date.now() - new Date(r.last_heartbeat_at).getTime() < ONLINE_MS;
}

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

function InstallationsPage() {
  const list = useServerFn(listInstallations);
  const { data = [], isLoading } = useQuery({
    queryKey: ["mc-installations"],
    queryFn: () => list({ data: {} } as never) as Promise<Row[]>,
    refetchInterval: 30000,
  });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (data as Row[]).filter((r) => {
      if (query) {
        const hay =
          `${r.install_id} ${r.license?.company_name ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (status === "online" && !isOnline(r)) return false;
      if (status === "offline" && isOnline(r)) return false;
      if (status === "revoked" && !r.license?.revoked) return false;
      return true;
    });
  }, [data, q, status]);

  const online = (data as Row[]).filter(isOnline).length;

  const columns: Column<Row>[] = [
    {
      key: "install",
      header: "Install",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {r.license?.company_name ?? "—"}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {r.install_id}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        if (r.license?.revoked)
          return <Badge variant="destructive">Revoked</Badge>;
        if (r.license?.suspended)
          return <Badge variant="outline">Suspended</Badge>;
        return isOnline(r) ? (
          <Badge>Online</Badge>
        ) : (
          <Badge variant="outline">Offline</Badge>
        );
      },
    },
    {
      key: "tier",
      header: "Tier",
      render: (r) => (
        <Badge variant="outline">{r.license?.tier ?? "—"}</Badge>
      ),
    },
    {
      key: "app_version",
      header: "App",
      render: (r) => (
        <span className="font-mono text-xs">{r.app_version ?? "—"}</span>
      ),
    },
    {
      key: "installer_version",
      header: "Installer",
      render: (r) => (
        <span className="font-mono text-xs">{r.installer_version ?? "—"}</span>
      ),
    },
    {
      key: "users",
      header: "Users",
      align: "right",
      render: (r) => (
        <span className="tabular-nums">
          {r.user_count ?? 0}
          <span className="text-muted-foreground">
            {" "}
            / {r.license?.seats ?? "—"}
          </span>
        </span>
      ),
    },
    {
      key: "heartbeat",
      header: "Heartbeat",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {relativeTime(r.last_heartbeat_at)}
        </span>
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
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Management Center"
        title="Installations"
        description="Registered self-hosted OPSQAI installs with live heartbeat telemetry."
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by install_id or company…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          <span className="tabular-nums">{online}</span> online ·{" "}
          <span className="tabular-nums">{rows.length}</span> /{" "}
          {(data as Row[]).length}
        </div>
      </div>

      <DataTable<Row>
        columns={columns}
        rows={rows}
        rowKey={(r) => r.install_id}
        loading={isLoading}
        empty={{
          icon: Package,
          title: (data as Row[]).length ? "No matches" : "No installations yet",
          description: (data as Row[]).length
            ? "Adjust filters to see more results."
            : "Installations appear here after an installer has phoned home.",
        }}
      />
    </div>
  );
}
