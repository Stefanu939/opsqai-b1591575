import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";

import { Building2, KeyRound, Package, Rocket, TrendingUp, Users } from "lucide-react";
import { getPlatformOverviewStats } from "@/lib/platform-overview.functions";
import { platformStats } from "@/lib/companies.functions";
import { ModulePage } from "@/components/app/module-page";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { MetricTile } from "@/components/ui/metric-tile";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/management/")({
  component: OverviewPage,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl p-6 md:p-10 space-y-3">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-1"
      >
        Try again
      </button>
    </div>
  ),
});

type Onboarding = {
  install_id: string;
  company_name: string;
  tier: string;
  seats: number | null;
  created_at: string;
  revoked: boolean;
  last_heartbeat_at: string | null;
};

function OverviewPage() {
  const { session } = useAuth();
  const overview = useServerFn(getPlatformOverviewStats);
  const stats = useServerFn(platformStats);

  const overviewQ = useQuery({
    queryKey: ["mc-overview"],
    queryFn: () => overview({ data: {} } as never),
    enabled: !!session,
  });
  const statsQ = useQuery({
    queryKey: ["mc-platform-stats"],
    queryFn: () => stats({ data: {} } as never),
    enabled: !!session,
  });

  const kpis = overviewQ.data?.kpis;
  const platform = statsQ.data;
  const releasesLatest = overviewQ.data?.currentRelease;

  const columns: Column<Onboarding>[] = [
    {
      key: "company",
      header: "Company",
      render: (r) => (
        <Link
          to="/management/installations"
          className="font-medium text-foreground hover:underline"
        >
          {r.company_name}
        </Link>
      ),
    },
    {
      key: "tier",
      header: "Tier",
      render: (r) => <Badge variant="outline">{r.tier}</Badge>,
    },
    {
      key: "seats",
      header: "Seats",
      align: "right",
      render: (r) => <span className="tabular-nums">{r.seats ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        if (r.revoked) return <Badge variant="destructive">Revoked</Badge>;
        const online =
          r.last_heartbeat_at &&
          Date.now() - new Date(r.last_heartbeat_at).getTime() < 15 * 60 * 1000;
        return (
          <Badge variant={online ? "default" : "outline"}>{online ? "Online" : "Offline"}</Badge>
        );
      },
    },
    {
      key: "created",
      header: "Onboarded",
      align: "right",
      render: (r) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <ModulePage
        eyebrow="Management Center"
        title="Control Center"
        description="Live state of every installation, license and customer across the OPSQAI fleet."
    >

      {/* Commercial KPIs — what the business earns and owes */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-1 w-6 rounded-full bg-[color:var(--mc-gold,var(--gold))]" />
          <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Commercial
          </h2>
        </div>
        <BentoGrid>
          <BentoItem span={3} index={0}>
            <MetricTile
              label="Active licenses"
              value={kpis?.activeLicenses ?? "—"}
              icon={KeyRound}
              hint="vs previous 30d"
              delta={
                kpis && kpis.activeLicensesTrend !== 0
                  ? {
                      value: `${Math.abs(kpis.activeLicensesTrend)}%`,
                      direction: kpis.activeLicensesTrend > 0 ? "up" : "down",
                    }
                  : undefined
              }
            />
          </BentoItem>
          <BentoItem span={3} index={1}>
            <MetricTile
              label="Revenue (30d)"
              value={
                kpis
                  ? new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    }).format(kpis.revenueMonthCents / 100)
                  : "—"
              }
              icon={TrendingUp}
              tone="gold"
              hint="Rolling window"
              delta={
                kpis && kpis.revenueTrend !== 0
                  ? {
                      value: `${Math.abs(kpis.revenueTrend)}%`,
                      direction: kpis.revenueTrend > 0 ? "up" : "down",
                    }
                  : undefined
              }
            />
          </BentoItem>
          <BentoItem span={3} index={2}>
            <MetricTile
              label="Expiring soon"
              value={kpis?.expiringSoon ?? "—"}
              icon={TrendingUp}
              hint="Within 30 days"
              tone={kpis && kpis.expiringSoon > 0 ? "warning" : "default"}
            />
          </BentoItem>
          <BentoItem span={3} index={3}>
            <MetricTile
              label="Companies"
              value={platform?.total_companies ?? "—"}
              icon={Building2}
              hint={platform ? `${platform.active_companies} active` : "Total on the platform"}
            />
          </BentoItem>
        </BentoGrid>
      </section>

      {/* Fleet health — what's running right now */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-1 w-6 rounded-full bg-[color:var(--mc-gold,var(--gold))]" />
          <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Fleet health
          </h2>
        </div>
        <BentoGrid>
          <BentoItem span={3} index={0}>
            <MetricTile
              label="Online installs"
              value={kpis?.onlineInstalls ?? "—"}
              icon={Package}
              hint="Heartbeat < 15 min"
            />
          </BentoItem>
          <BentoItem span={3} index={1}>
            <MetricTile
              label="Users total"
              value={platform?.total_users ?? "—"}
              icon={Users}
              hint="Across all tenants"
            />
          </BentoItem>
          <BentoItem span={3} index={2}>
            <MetricTile
              label="Active companies"
              value={platform?.active_companies ?? "—"}
              icon={Building2}
              hint="Have run in last 30d"
            />
          </BentoItem>
          <BentoItem span={3} index={3}>
            <MetricTile
              label="Current release"
              value={releasesLatest?.version ?? "—"}
              icon={Rocket}
              tone="gold"
              hint={releasesLatest?.channel ?? "No release published"}
            />
          </BentoItem>
        </BentoGrid>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-1 w-6 rounded-full bg-[color:var(--mc-gold,var(--gold))]" />
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Latest onboardings
            </h2>
          </div>
          <Link
            to="/management/installations"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all →
          </Link>
        </div>
        <DataTable<Onboarding>
          columns={columns}
          rows={overviewQ.data?.latestOnboardings ?? []}
          rowKey={(r) => r.install_id}
          loading={overviewQ.isLoading}
          empty={{
            icon: Package,
            title: "No onboardings yet",
            description: "New license installations will appear here.",
          }}
        />
      </section>
    </ModulePage>
  );
}
