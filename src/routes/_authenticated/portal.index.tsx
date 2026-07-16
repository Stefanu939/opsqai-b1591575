import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getMyPortalOverview } from "@/lib/portal.functions";
import { listAnnouncementsPublic, signPortalStoragePath } from "@/lib/portal-admin.functions";

import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import emptyInstallationsIllustration from "@/assets/empty-installations.png";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Download, FileText, MessagesSquare, Inbox, Newspaper, Pin, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: PortalHome,
});

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function PortalHome() {
  const fn = useServerFn(getMyPortalOverview);
  const listNews = useServerFn(listAnnouncementsPublic);
  const sign = useServerFn(signPortalStoragePath);
  const { data, isLoading } = useQuery({
    queryKey: ["portal-overview"],
    queryFn: () => fn({ data: {} } as never),
  });
  const { data: news = [] } = useQuery({
    queryKey: ["portal-announcements-public"],
    queryFn: () => listNews({ data: {} } as never),
  });
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

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
          Customer portal
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
          Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          {data?.email ? `Signed in as ${data.email}. ` : ""}
          Your installations, licenses and announcements at a glance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <StatCard label="Active installations" value={active} icon={Package} />
        <StatCard label="Module licenses" value={modules} icon={FileText} />
        <StatCard
          label={expiringSoon ? "Renewal due soon" : "Next maintenance renewal"}
          value={fmt(nextMaint)}
          icon={Download}
        />
      </div>

      {topNews.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span aria-hidden className="block w-1 h-6 rounded-full bg-[color:var(--gold)]" />
              <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-[color:var(--gold)]" />
                What's new
              </h2>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link to="/portal/news">
                See all
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {topNews.map((n) => (
              <Link
                key={n.id}
                to="/portal/news/$slug"
                params={{ slug: n.slug }}
                className="block"
              >
                <Card className="overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all h-full">
                  {covers[n.id] ? (
                    <img src={covers[n.id]} alt="" className="w-full h-32 object-cover bg-muted" />
                  ) : (
                    <div className="w-full h-32 bg-muted flex items-center justify-center text-muted-foreground">
                      <Newspaper className="h-6 w-6" />
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {n.pinned && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Pin className="h-2.5 w-2.5 mr-0.5" />
                          pinned
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {n.published_at ? new Date(n.published_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <div className="font-medium line-clamp-2">{n.title}</div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-3 mb-4">
        <span aria-hidden className="block w-1 h-6 rounded-full bg-[color:var(--gold)]" />
        <h2 className="text-lg font-display font-semibold">Your installations</h2>
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
            const seats = inst.install_license?.seats;
            const status = inst.install_license?.revoked
              ? "Revoked"
              : inst.install_license?.suspended
                ? "Suspended"
                : inst.install_license
                  ? "Active"
                  : "Pending";
            return (
              <Card key={inst.install_id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Install</div>
                    <div className="font-mono text-sm truncate">{inst.install_id}</div>
                    <div className="text-sm mt-1 font-medium">{inst.company_name}</div>
                  </div>
                  <Badge variant={inst.owner_type === "customer" ? "default" : "outline"}>
                    {inst.owner_type === "customer" ? "Customer-owned" : "OPSQAI-owned"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm border-t border-border pt-3">
                  <div>
                    <div className="text-muted-foreground text-xs">Seats</div>
                    <div className="font-medium">{seats ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Maintenance</div>
                    <div className="font-medium">{fmt(maint)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Modules</div>
                    <div className="font-medium">{inst.module_licenses.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Status</div>
                    <div className="font-medium">{status}</div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/portal/downloads">
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Downloads
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/portal/subscription">
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Subscription
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/portal/support">
                      <MessagesSquare className="h-3.5 w-3.5 mr-1" />
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
  );
}
