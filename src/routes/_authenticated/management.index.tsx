import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";

import { Building2, KeyRound, Package, Rocket, TrendingUp } from "lucide-react";
import { getPlatformOverviewStats } from "@/lib/platform-overview.functions";
import { platformStats } from "@/lib/companies.functions";
import { ModulePage } from "@/components/app/module-page";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { MetricTile } from "@/components/ui/metric-tile";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { AreaTrend } from "@/components/ui/mini-chart";
import { ProgressRing } from "@/components/ui/progress-ring";
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

  const timeline = overviewQ.data?.licensesTimeline ?? [];
  const growth = timeline.map((m) => ({
    month: m.month,
    total: m.basic + m.standard + m.business + m.enterprise,
  }));
  const growthSeries = growth.map((g) => g.total);
  const tierMix = overviewQ.data?.tierMix ?? [];
  const tierTotal = tierMix.reduce((a, t) => a + t.count, 0);

  return (
    <ModulePage
      eyebrow="Management Center"
      title="Control Center"
      description="Live state of every installation, license and customer across the OPSQAI fleet."
      width="full"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {/* Licenses growth */}
          <div className="oq-soft-card p-4 md:p-5">
            <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-display truncate text-base font-semibold text-foreground">
                  Licenses growth
                </h2>
                <p className="text-xs text-muted-foreground">Active licenses per month</p>
              </div>
              <span className="shrink-0 rounded-full border border-border bg-secondary/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Last 12 months
              </span>
            </div>
            {growth.length > 0 ? (
              <AreaTrend data={growth} xKey="month" yKey="total" height={230} />
            ) : (
              <div className="grid h-[230px] place-items-center text-sm text-muted-foreground">
                {overviewQ.isLoading ? "Loading…" : "No license history yet"}
              </div>
            )}
          </div>

          {/* Commercial KPIs */}
          <BentoGrid>
            <BentoItem span={3} index={0}>
              <MetricTile
                label="Active licenses"
                value={kpis?.activeLicenses ?? "—"}
                icon={KeyRound}
                series={growthSeries}
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
                label="Online installs"
                value={kpis?.onlineInstalls ?? "—"}
                icon={Package}
                hint="Heartbeat < 15 min"
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

          {/* Fleet health */}
          <div className="oq-soft-card grid gap-5 p-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:p-5">
            <div className="flex items-center gap-5">
              <ProgressRing
                value={
                  kpis && kpis.activeLicenses > 0
                    ? Math.round((kpis.onlineInstalls / kpis.activeLicenses) * 100)
                    : 0
                }
                size={112}
              />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Fleet health
                </div>
                <div className="font-display mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {kpis?.onlineInstalls ?? "—"}
                  <span className="text-base text-muted-foreground">
                    /{kpis?.activeLicenses ?? "—"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">Installations reporting in</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Tier mix
              </div>
              {tierMix.length === 0 && (
                <div className="text-sm text-muted-foreground">No licenses issued yet</div>
              )}
              {tierMix.map((t) => (
                <div key={t.tier} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-xs capitalize text-muted-foreground">
                    {t.tier}
                  </span>
                  <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                    <span
                      className="block h-full rounded-full bg-[color:var(--gold)]"
                      style={{
                        width: `${tierTotal ? Math.max(4, (t.count / tierTotal) * 100) : 0}%`,
                      }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-xs tabular-nums text-foreground">
                    {t.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-4">
          <UpcomingCard scope="platform" to="/management/calendar" />

          <div className="oq-soft-card p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-semibold text-foreground">Release</h2>
              <span className="rounded-full border border-[var(--gold-line)] bg-[var(--gold-soft)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--gold)]">
                {releasesLatest?.channel ?? "none"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--gold-soft)] text-[color:var(--gold)]">
                <Rocket className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="font-display truncate text-lg font-semibold text-foreground">
                  {releasesLatest?.version ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground">Currently published</div>
              </div>
            </div>
            <Link
              to="/management/releases"
              className="mt-3 inline-flex text-xs font-medium text-[color:var(--gold)] hover:underline"
            >
              Manage releases →
            </Link>
          </div>

          <div className="oq-soft-card p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-semibold text-foreground">Expiring soon</h2>
              <Link
                to="/management/licenses"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                View all →
              </Link>
            </div>
            <div className="font-display text-3xl font-semibold tabular-nums text-foreground">
              {kpis?.expiringSoon ?? "—"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Licenses expiring within the next 30 days.
            </p>
          </div>

          <div className="oq-soft-card p-4 md:p-5">
            <h2 className="font-display mb-1 text-sm font-semibold text-foreground">Users</h2>
            <div className="font-display text-3xl font-semibold tabular-nums text-foreground">
              {platform?.total_users ?? "—"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Across all tenants</p>
          </div>
        </div>
      </div>

      <section className="oq-soft-card space-y-3 p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display truncate text-base font-semibold text-foreground">
              Latest onboardings
            </h2>
            <p className="text-xs text-muted-foreground">Newest installations on the fleet</p>
          </div>
          <Link
            to="/management/installations"
            className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
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

