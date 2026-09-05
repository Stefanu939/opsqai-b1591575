import { ModulePage } from "@/components/app/module-page";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getMyPortalOverview, listPortalReleases } from "@/lib/portal.functions";
import { listAnnouncementsPublic, signPortalStoragePath } from "@/lib/portal-admin.functions";
import { listSupportConversations } from "@/lib/support.functions";
import { useAuth } from "@/lib/auth-context";

import { EmptyState } from "@/components/ui/empty-state";
import emptyInstallationsIllustration from "@/assets/empty-installations.png";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  Package,
  Download,
  FileText,
  MessagesSquare,
  Newspaper,
  Pin,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Boxes,
  Star,
  CircleAlert,
  CircleCheck,
  Info,
  Users,
  CalendarDays,
} from "lucide-react";
import { UpcomingCard } from "@/components/calendar/upcoming-card";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: PortalHome,
});

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

const ticketTone = {
  open: { tone: "warning" as const, icon: CircleAlert, label: "Open" },
  pending: { tone: "primary" as const, icon: MessagesSquare, label: "In progress" },
  resolved: { tone: "success" as const, icon: CircleCheck, label: "Resolved" },
  closed: { tone: "neutral" as const, icon: Info, label: "Closed" },
};

function PortalHome() {
  const { user } = useAuth();
  const fn = useServerFn(getMyPortalOverview);
  const listNews = useServerFn(listAnnouncementsPublic);
  const listTickets = useServerFn(listSupportConversations);
  const listReleases = useServerFn(listPortalReleases);
  const sign = useServerFn(signPortalStoragePath);
  const { data, isLoading } = useQuery({
    queryKey: ["portal-overview"],
    queryFn: () => fn({ data: {} } as never),
  });
  const { data: news = [] } = useQuery({
    queryKey: ["portal-announcements-public"],
    queryFn: () => listNews({ data: {} } as never),
  });
  const { data: tickets = [] } = useQuery({
    queryKey: ["portal-tickets-overview"],
    queryFn: () => listTickets({ data: { scope: "mine" } } as never),
    retry: false,
  });
  const { data: releases = [] } = useQuery({
    queryKey: ["portal-releases-overview"],
    queryFn: () => listReleases({ data: {} } as never),
    retry: false,
  });
  const latestRelease = releases[0];
  const topNews = news.slice(0, 3);
  const [covers, setCovers] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const out: Record<string, string> = {};
      for (const r of topNews) {
        if (r.cover_image_url?.startsWith("portal-news-images/")) {
          try {
            const { url } = await sign({
              data: {
                bucket: "portal-news-images",
                path: r.cover_image_url.slice("portal-news-images/".length),
                expiresIn: 3600,
              },
            });
            out[r.id] = url;
          } catch {
            /* skip */
          }
        } else if (r.cover_image_url) {
          out[r.id] = r.cover_image_url;
        }
      }
      setCovers(out);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [news.length]);

  const installs = data?.installs ?? [];
  const primary = installs[0];
  const active = installs.filter(
    (i) => i.install_license && !i.install_license.revoked && !i.install_license.suspended,
  ).length;
  const modules = installs.reduce((s, i) => s + i.module_licenses.length, 0);
  const nextMaint = installs
    .map((i) => i.install_license?.maintenance_expires_at)
    .filter((d): d is string => !!d)
    .sort()[0];

  const expiringSoon = nextMaint
    ? (new Date(nextMaint).getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 60
    : false;
  const seats = primary?.install_license?.seats ?? null;
  const firstName = (data?.email ?? user?.email ?? "").split("@")[0]?.split(/[._-]/)[0] ?? "";
  const greeting = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : "there";

  const downloads = [
    {
      icon: Download,
      title: "Installer",
      description: "Full OPSQAI installer package.",
    },
    {
      icon: ShieldCheck,
      title: "Activation bundle",
      description: "Activation bundle for your installation.",
    },
    {
      icon: KeyRound,
      title: "Module license",
      description: "License file for enabled modules.",
    },
  ];

  return (
    <ModulePage eyebrow="Customer portal" title="Overview" width="full">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          {/* Welcome banner */}
           <div className="oq-soft-card relative overflow-hidden p-5 md:p-6">
             <div className="relative">
              <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                Welcome back, {greeting}! 👋
              </h2>
              <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                Here's what's happening with your OPSQAI installation.
              </p>
            </div>
          </div>

          {/* Installation status */}
          <div className="oq-soft-card flex flex-wrap items-center gap-4 p-4 md:p-5">
            <IconTile icon={Boxes} size="lg" />
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold text-foreground">
                Your installation
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-x-8 gap-y-1 text-sm">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Company
                  </div>
                  <div className="font-medium text-foreground">{primary?.company_name ?? "—"}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Install
                  </div>
                  <div className="truncate font-mono text-xs text-foreground">
                    {primary?.install_id ?? "—"}
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge
                variant={active > 0 ? "default" : "outline"}
                className="rounded-full px-3 py-1"
              >
                {active > 0 ? "Active" : "Pending"}
              </Badge>
              {latestRelease?.version && (
                <span className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-foreground">
                  v {latestRelease.version}
                </span>
              )}
            </div>
          </div>

          {/* Download cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {downloads.map((d) => (
              <Card key={d.title} className="flex flex-col gap-3 p-4 oq-lift">
                <IconTile icon={d.icon} size="lg" />
                <div>
                  <div className="font-display text-sm font-semibold text-foreground">{d.title}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {d.description}
                  </p>
                </div>
                <Button asChild size="sm" className="mt-auto w-full rounded-xl">
                  <Link to="/portal/downloads">
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download
                  </Link>
                </Button>
              </Card>
            ))}
          </div>

          {/* Subscription */}
          <div className="oq-soft-card p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-foreground">
                Your subscription
              </h3>
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link to="/portal/subscription">Manage subscription</Link>
              </Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={active > 0 ? 100 : 0}
                  size={104}
                  label={`${active}`}
                  sublabel="Active"
                />
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="font-display text-xl font-semibold tabular-nums text-foreground">
                      {seats ?? "—"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      Licensed seats
                    </div>
                  </div>
                  <div>
                    <div className="font-display text-xl font-semibold tabular-nums text-foreground">
                      {modules}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      Module licenses
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-secondary/50 p-3">
                  <div className="flex items-center gap-2">
                    <IconTile
                      icon={CalendarDays}
                      size="sm"
                      tone={expiringSoon ? "warning" : "neutral"}
                    />
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {expiringSoon ? "Renewal due soon" : "Maintenance until"}
                    </div>
                  </div>
                  <div className="mt-2 font-display text-lg font-semibold text-foreground">
                    {fmt(nextMaint)}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/50 p-3">
                  <div className="flex items-center gap-2">
                    <IconTile icon={Package} size="sm" tone="neutral" />
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Installations
                    </div>
                  </div>
                  <div className="mt-2 font-display text-lg font-semibold tabular-nums text-foreground">
                    {installs.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Installations */}
          <div className="flex items-center gap-3">
            <span aria-hidden className="block h-6 w-1 rounded-full bg-[color:var(--gold)]" />
            <h2 className="font-display text-lg font-semibold">Your installations</h2>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : installs.length === 0 ? (
            <EmptyState
              illustration={emptyInstallationsIllustration}
              title="No installations linked to your account yet"
              description="If you expect to see one, open a support ticket and we will link it for you."
              action={
                <Button asChild size="sm">
                  <Link to="/portal/support">Contact support</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {installs.map((inst) => {
                const maint = inst.install_license?.maintenance_expires_at;
                const instSeats = inst.install_license?.seats;
                const status = inst.install_license?.revoked
                  ? "Revoked"
                  : inst.install_license?.suspended
                    ? "Suspended"
                    : inst.install_license
                      ? "Active"
                      : "Pending";
                return (
                  <Card key={inst.install_id} className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-3">
                        <IconTile icon={Boxes} size="md" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{inst.company_name}</div>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            {inst.install_id}
                          </div>
                        </div>
                      </div>
                      <Badge variant={inst.owner_type === "customer" ? "default" : "outline"}>
                        {inst.owner_type === "customer" ? "Customer-owned" : "OPSQAI-owned"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Seats</div>
                        <div className="font-medium">{instSeats ?? "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Maintenance</div>
                        <div className="font-medium">{fmt(maint)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Modules</div>
                        <div className="font-medium">{inst.module_licenses.length}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Status</div>
                        <div className="font-medium">{status}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/portal/downloads">
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Downloads
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/portal/subscription">
                          <FileText className="mr-1 h-3.5 w-3.5" />
                          Subscription
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/portal/support">
                          <MessagesSquare className="mr-1 h-3.5 w-3.5" />
                          Support
                        </Link>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-4">
          <div className="oq-soft-card p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-semibold text-foreground">Support tickets</h3>
              <Link
                to="/portal/support"
                className="text-xs font-medium text-[color:var(--gold)] hover:underline"
              >
                View all
              </Link>
            </div>
            {tickets.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tickets yet.</p>
            ) : (
              <div className="space-y-2">
                {tickets.slice(0, 5).map((t) => {
                  const meta =
                    ticketTone[(t.status as keyof typeof ticketTone) ?? "open"] ?? ticketTone.open;
                  return (
                    <Link
                      key={t.id}
                      to="/portal/support"
                      className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-3 transition-colors hover:bg-secondary/70"
                    >
                      <IconTile icon={meta.icon} tone={meta.tone} size="md" round />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {t.subject}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {t.last_message_at ? new Date(t.last_message_at).toLocaleDateString() : ""}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 rounded-full text-[10px]">
                        {meta.label}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="oq-soft-card p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-semibold text-foreground">Latest release</h3>
              {latestRelease?.version && (
                <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-foreground">
                  v {latestRelease.version}
                </span>
              )}
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-3">
              <IconTile icon={Star} size="lg" round />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {latestRelease?.version
                    ? `OPSQAI ${latestRelease.version} is now available!`
                    : "No release published yet"}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {latestRelease
                    ? "Review the release notes for what changed in this version."
                    : "Release announcements will show up here."}
                </p>
                <Link
                  to="/portal/release-notes"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--gold)] hover:underline"
                >
                  See what's new
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          <UpcomingCard scope="portal" to="/portal/calendar" />

          {topNews.length > 0 && (
            <div className="oq-soft-card p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-display flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Newspaper className="h-4 w-4 text-[color:var(--gold)]" />
                  What's new
                </h3>
                <Link
                  to="/portal/news"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  See all
                </Link>
              </div>
              <div className="space-y-2">
                {topNews.map((n) => (
                  <Link
                    key={n.id}
                    to="/portal/news/$slug"
                    params={{ slug: n.slug }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-2.5 transition-colors hover:bg-secondary/70"
                  >
                    {covers[n.id] ? (
                      <img
                        src={covers[n.id]}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <IconTile icon={Newspaper} size="lg" />
                    )}
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-xs font-medium text-foreground">
                        {n.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {n.pinned && (
                          <span className="inline-flex items-center gap-0.5">
                            <Pin className="h-2.5 w-2.5" />
                            pinned
                          </span>
                        )}
                        {n.published_at ? new Date(n.published_at).toLocaleDateString() : ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ModulePage>
  );
}
