// Management Center → Usage audit index: pick an installation to audit.
// Numbers only; the per-install screen never shows customer content.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSelfHostFleet, type SelfHostFleetRow } from "@/lib/selfhost-fleet.functions";
import { ModulePage } from "@/components/app/module-page";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/management/usage/")({
  head: () => ({
    meta: [
      { title: "Usage audit — Management Center" },
      {
        name: "description",
        content:
          "Pick a self-hosted OPSQAI installation to review its aggregate usage audit: adoption, time in app, AI usage, deadlines and availability.",
      },
      { property: "og:title", content: "Usage audit — Management Center" },
      {
        property: "og:description",
        content: "Aggregate-only usage audit per self-hosted installation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsageIndexPage,
});

function UsageIndexPage() {
  const fetchFleet = useServerFn(listSelfHostFleet);
  const query = useQuery({
    queryKey: ["mc-usage-fleet"],
    queryFn: () => fetchFleet({ data: {} }) as Promise<SelfHostFleetRow[]>,
    refetchInterval: 60_000,
  });
  const rows = query.data ?? [];

  const columns: Column<SelfHostFleetRow>[] = [
    {
      key: "organization_name",
      header: "Installation",
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">
            {r.organization_name ?? r.install_id}
          </div>
          <div className="truncate font-mono text-xs text-muted-foreground">{r.install_id}</div>
        </div>
      ),
    },
    {
      key: "app_version",
      header: "Version",
      render: (r) => <span className="text-sm">{r.app_version ?? "—"}</span>,
    },
    {
      key: "last_heartbeat_at",
      header: "Last report",
      render: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.last_heartbeat_at ? r.last_heartbeat_at.slice(0, 16).replace("T", " ") : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <Link
          to="/management/usage/$installId"
          params={{ installId: r.install_id }}
          className="text-xs text-foreground underline underline-offset-4 hover:no-underline"
        >
          Open audit →
        </Link>
      ),
    },
  ];

  return (
    <ModulePage
      eyebrow="Management Center"
      title="Usage audit"
      description="How much and how each self-hosted installation is used, measured from aggregate counters only. No customer documents, names, messages or personal data are transmitted or shown."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Numbers only
        </Badge>
        <span className="text-sm text-muted-foreground">{rows.length} installations</span>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          No installation has reported yet. Once an installation sends its scheduled report, it
          appears here.
        </div>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.install_id} />
      )}
    </ModulePage>
  );
}
