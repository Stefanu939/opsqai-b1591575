// Aggregated KPI + timeline stats for the MC overview dashboard.

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";

export interface OverviewStats {
  kpis: {
    activeLicenses: number;
    activeLicensesTrend: number;
    onlineInstalls: number;
    onlineInstallsTrend: number;
    expiringSoon: number;
    revenueMonthCents: number;
    revenueTrend: number;
  };
  tierMix: Array<{ tier: string; count: number }>;
  installsPerWeek: Array<{ week: string; count: number }>;
  licensesTimeline: Array<{
    month: string;
    basic: number;
    standard: number;
    business: number;
    enterprise: number;
  }>;
  latestOnboardings: Array<{
    install_id: string;
    company_name: string;
    tier: string;
    seats: number | null;
    created_at: string;
    revoked: boolean;
    last_heartbeat_at: string | null;
  }>;
  currentRelease: {
    version: string | null;
    channel: string | null;
    published_at: string | null;
  } | null;
}

const HEARTBEAT_ONLINE_MS = 15 * 60 * 1000;

export const getPlatformOverviewStats = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<OverviewStats> => {
    await requirePlatformAdmin(context);
    const supabaseAdmin = getCloudSupabase(context, "platform-overview");

    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();
    const expiringHorizon = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();

    const [installsRes, ordersRes, licenseInstallsRes, releaseRes] = await Promise.all([
      supabaseAdmin
        .from("licenses")
        .select(
          "install_id, company_name, tier, seats, expires_at, revoked, created_at",
        )
        .eq("kind", "install")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("license_orders")
        .select("unit_price_cents, paid_at, status")
        .eq("status", "paid")
        .gte("paid_at", sixtyDaysAgo),
      supabaseAdmin
        .from("license_installs")
        .select("install_id, last_heartbeat_at, installer_version"),
      supabaseAdmin
        .from("license_releases")
        .select("version, channel, published_at")
        .eq("is_current", true)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const installs = (installsRes.data ?? []) as Array<{
      install_id: string;
      company_name: string;
      tier: string | null;
      seats: number | null;
      expires_at: string | null;
      revoked: boolean;
      created_at: string;
    }>;
    const orders = (ordersRes.data ?? []) as Array<{
      unit_price_cents: number | null;
      paid_at: string | null;
    }>;
    const licenseInstalls = (licenseInstallsRes.data ?? []) as Array<{
      install_id: string;
      last_heartbeat_at: string | null;
    }>;
    const byInstall = new Map(licenseInstalls.map((i) => [i.install_id, i]));

    // KPIs
    const activeLicenses = installs.filter((i) => !i.revoked).length;
    const activeLicensesPrev = installs.filter(
      (i) => !i.revoked && new Date(i.created_at).getTime() < now - 30 * 24 * 60 * 60 * 1000,
    ).length;
    const activeLicensesTrend =
      activeLicensesPrev > 0
        ? Math.round(((activeLicenses - activeLicensesPrev) / activeLicensesPrev) * 100)
        : 0;

    const onlineCutoff = now - HEARTBEAT_ONLINE_MS;
    const onlineInstalls = licenseInstalls.filter(
      (i) => i.last_heartbeat_at && new Date(i.last_heartbeat_at).getTime() > onlineCutoff,
    ).length;

    const expiringSoon = installs.filter(
      (i) =>
        !i.revoked &&
        i.expires_at &&
        i.expires_at < expiringHorizon &&
        i.expires_at > new Date(now).toISOString(),
    ).length;

    const revenueMonthCents = orders
      .filter((o) => o.paid_at && o.paid_at >= thirtyDaysAgo)
      .reduce((sum, o) => sum + (o.unit_price_cents ?? 0), 0);
    const revenuePrevCents = orders
      .filter(
        (o) => o.paid_at && o.paid_at < thirtyDaysAgo && o.paid_at >= sixtyDaysAgo,
      )
      .reduce((sum, o) => sum + (o.unit_price_cents ?? 0), 0);
    const revenueTrend =
      revenuePrevCents > 0
        ? Math.round(((revenueMonthCents - revenuePrevCents) / revenuePrevCents) * 100)
        : 0;

    // Tier mix
    const tierCounts = new Map<string, number>();
    for (const i of installs) {
      if (i.revoked) continue;
      const tier = i.tier ?? "basic";
      tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1);
    }
    const tierMix = Array.from(tierCounts.entries()).map(([tier, count]) => ({
      tier,
      count,
    }));

    // Installs per week (last 8 weeks)
    const installsPerWeek: Array<{ week: string; count: number }> = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now - (i - 1) * 7 * 24 * 60 * 60 * 1000);
      const count = installs.filter((inst) => {
        const t = new Date(inst.created_at).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      }).length;
      installsPerWeek.push({
        week: `W${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        count,
      });
    }

    // Licenses timeline (last 6 months, cumulative by tier)
    const licensesTimeline: OverviewStats["licensesTimeline"] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let m = 5; m >= 0; m--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - m);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      const bucket = { basic: 0, standard: 0, business: 0, enterprise: 0 };
      for (const inst of installs) {
        if (inst.revoked) continue;
        if (new Date(inst.created_at).getTime() >= monthEnd) continue;
        const t = (inst.tier ?? "basic") as keyof typeof bucket;
        if (t in bucket) bucket[t] += 1;
      }
      licensesTimeline.push({
        month: monthNames[d.getMonth()],
        ...bucket,
      });
    }

    const latestOnboardings = installs.slice(0, 7).map((i) => ({
      install_id: i.install_id,
      company_name: i.company_name,
      tier: i.tier ?? "basic",
      seats: i.seats,
      created_at: i.created_at,
      revoked: i.revoked,
      last_heartbeat_at: byInstall.get(i.install_id)?.last_heartbeat_at ?? null,
    }));

    return {
      kpis: {
        activeLicenses,
        activeLicensesTrend,
        onlineInstalls,
        onlineInstallsTrend: 0,
        expiringSoon,
        revenueMonthCents,
        revenueTrend,
      },
      tierMix,
      installsPerWeek,
      licensesTimeline,
      latestOnboardings,
      currentRelease: releaseRes.data ?? null,
    };
  });
