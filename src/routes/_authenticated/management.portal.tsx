import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPortalSnapshot } from "@/lib/mc-admin.functions";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Package, Rocket, Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/management/portal")({
  head: () => ({ meta: [{ title: "Portal — Management Center" }] }),
  component: PortalPage,
});

type Snapshot = {
  releases: Array<{
    version: string;
    channel: string;
    is_current: boolean;
    published_at: string | null;
  }>;
  activeInstalls: number;
  totalInstalls: number;
  openTickets: number;
};

function PortalPage() {
  const get = useServerFn(getPortalSnapshot);
  const { data, isLoading } = useQuery({
    queryKey: ["mc-portal-snapshot"],
    queryFn: () => get({ data: {} } as never) as Promise<Snapshot>,
  });

  const s = data ?? { releases: [], activeInstalls: 0, totalInstalls: 0, openTickets: 0 };

  const releaseColumns: Column<Snapshot["releases"][number]>[] = [
    {
      key: "version",
      header: "Version",
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium">{r.version}</span>
          {r.is_current && <Badge>Current</Badge>}
        </div>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      render: (r) => <Badge variant="outline">{r.channel}</Badge>,
    },
    {
      key: "published",
      header: "Published",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.published_at ? new Date(r.published_at).toLocaleString() : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Management Center"
        title="Portal"
        description="What OPSQAI customers see in their Customer Portal."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          label="Active installs with portal access"
          value={s.activeInstalls}
          hint={`${s.totalInstalls} total`}
          icon={Package}

        />
        <StatCard
          label="Releases published"
          value={s.releases.length}
          hint="Visible to customers"
          icon={Rocket}

        />
        <StatCard
          label="Open tickets"
          value={s.openTickets}
          icon={Inbox}

        />
      </div>

      <SectionCard
        title="Latest releases visible to customers"
        description="Customers view these in their portal → Release notes."
        actions={
          <Link
            to="/management/releases"
            className="text-xs text-foreground underline underline-offset-4 hover:no-underline"
          >
            Manage releases →
          </Link>
        }
      >
        <DataTable<Snapshot["releases"][number]>
          columns={releaseColumns}
          rows={s.releases}
          rowKey={(r) => r.version + r.channel}

          empty={{
            icon: LifeBuoy,
            title: "No releases yet",
            description: "Publish a release to make it visible in the customer portal.",
          }}
        />
      </SectionCard>
    </div>
  );
}
