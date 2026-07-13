import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";
import {
  KeyRound,
  Activity,
  Timer,
  Coins,
  UserPlus,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import { Suspense } from "react";
import { KpiCard } from "@/components/platform/KpiCard";
import { PremiumCard } from "@/components/platform/PremiumCard";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { getPlatformOverviewStats } from "@/lib/platform-overview.functions";

export const Route = createFileRoute("/_authenticated/app/platform/overview")({
  component: OverviewPage,
});

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const TIER_COLORS: Record<string, string> = {
  basic: "#6a7db3",
  standard: "#8fbf7a",
  business: "#c9a84c",
  enterprise: "#f0d78c",
};

function OverviewPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewContent />
    </Suspense>
  );
}

function OverviewSkeleton() {
  return (
    <div className="mc-enter p-4 md:p-6">
      <div className="mb-4 h-6 w-40 mc-shimmer rounded" />
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mc-surface h-28 mc-shimmer" />
        ))}
      </div>
    </div>
  );
}

function OverviewContent() {
  const fetchStats = useServerFn(getPlatformOverviewStats);
  const { data } = useSuspenseQuery({
    queryKey: ["platform-overview-stats"],
    queryFn: () =>
      (fetchStats as unknown as () => Promise<
        import("@/lib/platform-overview.functions").OverviewStats
      >)(),
    staleTime: 60_000,
  });

  const sparkFromWeeks = data.installsPerWeek.map((w) => ({ v: w.count }));
  const tierMixWithColors = data.tierMix.map((t) => ({
    ...t,
    fill: TIER_COLORS[t.tier] ?? "#c9a84c",
  }));

  return (
    <div className="mc-enter p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="mc-eyebrow">Mission Control · Overview</div>
          <h1 className="mc-heading mt-1 text-2xl font-bold tracking-tight">
            <span className="mc-gold-text">Platform snapshot</span>
          </h1>
          <p className="mt-1 text-xs text-[var(--mc-fg-muted)]">
            Real-time state across all customer installations. Updates every 60s.
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="h-9 gap-1.5 bg-gradient-to-b from-[#d4b458] to-[#a48633] text-[#0d0d0d] font-semibold mc-shadow-gold hover:brightness-110"
        >
          <Link to="/app/platform/onboarding">
            <UserPlus className="h-4 w-4" /> Onboard client nou
          </Link>
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          eyebrow="Revenue · 30d"
          value={formatCents(data.kpis.revenueMonthCents)}
          trend={data.kpis.revenueTrend}
          icon={Coins}
          spark={sparkFromWeeks}
          hint="Paid orders in last 30 days"
          hoverTitle="Monthly recurring revenue"
          hoverBody="Sum of all paid license_orders in the last 30 days. Trend is vs. previous 30-day window."
        />
        <KpiCard
          eyebrow="Active licenses"
          value={String(data.kpis.activeLicenses)}
          trend={data.kpis.activeLicensesTrend}
          icon={KeyRound}
          spark={sparkFromWeeks}
          hint="Not revoked"
          hoverTitle="Installation licenses"
          hoverBody="Distinct install_id licenses currently non-revoked across all tiers. Trend = growth vs. 30d ago."
        />
        <KpiCard
          eyebrow="Installs online"
          value={String(data.kpis.onlineInstalls)}
          icon={Activity}
          hint="Heartbeat < 15 min"
          hoverTitle="Live heartbeat"
          hoverBody="Self-hosted installs that reported a heartbeat within the last 15 minutes. Includes only production installs."
        />
        <KpiCard
          eyebrow="Expiring · 30d"
          value={String(data.kpis.expiringSoon)}
          icon={Timer}
          hint="Contact for renewal"
          hoverTitle="Renewal window"
          hoverBody="Licenses expiring within the next 30 days. Trigger renewal outreach and pre-authorize maintenance."
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PremiumCard
          eyebrow="Growth"
          title="Licenses by tier · last 6 months"
          className="lg:col-span-2"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.licensesTimeline}>
                <defs>
                  <linearGradient id="g-basic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6a7db3" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6a7db3" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-standard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8fbf7a" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#8fbf7a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-business" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#c9a84c" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-enterprise" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f0d78c" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#f0d78c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(201,168,76,0.06)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#8a8578", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(201,168,76,0.15)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#8a8578", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#141414",
                    border: "1px solid rgba(201,168,76,0.4)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#f5f0e0",
                  }}
                  labelStyle={{ color: "#c9a84c" }}
                />
                <Area type="monotone" dataKey="basic" stackId="1" stroke="#6a7db3" fill="url(#g-basic)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="standard" stackId="1" stroke="#8fbf7a" fill="url(#g-standard)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="business" stackId="1" stroke="#c9a84c" fill="url(#g-business)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="enterprise" stackId="1" stroke="#f0d78c" fill="url(#g-enterprise)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </PremiumCard>

        <PremiumCard eyebrow="Mix" title="Tier distribution">
          <div className="h-56">
            {tierMixWithColors.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-[var(--mc-fg-muted)]">
                No active licenses yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="30%"
                  outerRadius="95%"
                  data={tierMixWithColors}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar dataKey="count" background={{ fill: "rgba(201,168,76,0.06)" }} cornerRadius={6} />
                  <Legend
                    iconSize={8}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ fontSize: 11, color: "#f5f0e0" }}
                    formatter={(_v, entry) => {
                      const p = entry.payload as unknown as { tier: string; count: number };
                      return (
                        <span style={{ color: "#f5f0e0" }}>
                          {p.tier} · <span style={{ color: "#8a8578" }}>{p.count}</span>
                        </span>
                      );
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#141414",
                      border: "1px solid rgba(201,168,76,0.4)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#f5f0e0",
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            )}
          </div>
        </PremiumCard>
      </div>

      {/* Third row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PremiumCard eyebrow="Velocity" title="New installs · last 8 weeks" className="lg:col-span-2">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.installsPerWeek}>
                <CartesianGrid stroke="rgba(201,168,76,0.06)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "#8a8578", fontSize: 11 }} axisLine={{ stroke: "rgba(201,168,76,0.15)" }} tickLine={false} />
                <YAxis tick={{ fill: "#8a8578", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(201,168,76,0.05)" }}
                  contentStyle={{
                    background: "#141414",
                    border: "1px solid rgba(201,168,76,0.4)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#f5f0e0",
                  }}
                />
                <Bar dataKey="count" fill="url(#g-bar)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="g-bar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f0d78c" />
                    <stop offset="100%" stopColor="#a48633" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PremiumCard>

        <PremiumCard eyebrow="Release" title="Current installer">
          {data.currentRelease ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="mc-eyebrow">Version</span>
                <span className="mc-gold-text mc-num text-xl font-bold">
                  {data.currentRelease.version}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--mc-fg-muted)]">Channel</span>
                <span className="rounded-md border border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-3)] px-2 py-0.5 font-medium text-[var(--mc-gold-glow)]">
                  {data.currentRelease.channel ?? "stable"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--mc-fg-muted)]">Published</span>
                <span className="mc-num text-[var(--mc-fg)]">
                  {timeAgo(data.currentRelease.published_at)}
                </span>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-2 w-full border-[var(--mc-gold-line-strong)] bg-transparent text-[var(--mc-gold-glow)] hover:bg-[var(--mc-surface-2)] hover:text-[var(--mc-gold)]"
              >
                <Link to="/app/platform/setup">
                  Manage releases <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="text-xs text-[var(--mc-fg-muted)]">No current release configured.</div>
          )}
        </PremiumCard>
      </div>

      {/* Latest onboardings */}
      <PremiumCard eyebrow="Recent activity" title="Latest onboardings">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[var(--mc-fg-dim)]">
                <th className="mc-eyebrow pb-2 pr-3">Install</th>
                <th className="mc-eyebrow pb-2 pr-3">Company</th>
                <th className="mc-eyebrow pb-2 pr-3">Tier</th>
                <th className="mc-eyebrow pb-2 pr-3">Seats</th>
                <th className="mc-eyebrow pb-2 pr-3">Heartbeat</th>
                <th className="mc-eyebrow pb-2 pr-3">Created</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {data.latestOnboardings.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[var(--mc-fg-muted)]">
                    No onboardings yet — start with the button above.
                  </td>
                </tr>
              )}
              {data.latestOnboardings.map((o) => (
                <tr
                  key={o.install_id}
                  className="border-t border-[var(--mc-gold-line)] transition-colors hover:bg-[var(--mc-surface-2)]"
                >
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-[var(--mc-gold-glow)]">
                    {o.install_id}
                  </td>
                  <td className="py-2.5 pr-3 text-[var(--mc-fg)]">{o.company_name}</td>
                  <td className="py-2.5 pr-3">
                    <span
                      className="rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                      style={{
                        borderColor: TIER_COLORS[o.tier] ?? "#c9a84c",
                        color: TIER_COLORS[o.tier] ?? "#c9a84c",
                      }}
                    >
                      {o.tier}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 mc-num text-[var(--mc-fg-muted)]">{o.seats ?? "—"}</td>
                  <td className="py-2.5 pr-3">
                    {o.last_heartbeat_at ? (
                      <span className="mc-num text-[var(--mc-success)]">
                        ● {timeAgo(o.last_heartbeat_at)}
                      </span>
                    ) : (
                      <span className="text-[var(--mc-fg-dim)]">— offline</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 mc-num text-[var(--mc-fg-muted)]">
                    {timeAgo(o.created_at)}
                  </td>
                  <td className="py-2.5 text-right">
                    <HoverCard openDelay={80}>
                      <HoverCardTrigger asChild>
                        <Link
                          to="/app/platform/installation-package/$installId"
                          params={{ installId: o.install_id }}
                          className="inline-flex items-center gap-1 text-[var(--mc-gold)] hover:text-[var(--mc-gold-glow)]"
                        >
                          Open <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </HoverCardTrigger>
                      <HoverCardContent
                        side="left"
                        className="w-56 border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-3)]"
                      >
                        <div className="mc-eyebrow mb-1 text-[var(--mc-gold-glow)]">Actions</div>
                        <p className="text-xs text-[var(--mc-fg-muted)]">
                          Re-mint download URL, view heartbeat, pin installer version, download activation bundle.
                        </p>
                      </HoverCardContent>
                    </HoverCard>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PremiumCard>
    </div>
  );
}
