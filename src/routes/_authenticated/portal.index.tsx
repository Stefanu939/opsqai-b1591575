import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getMyPortalOverview } from "@/lib/portal.functions";
import { listAnnouncementsPublic, signPortalStoragePath } from "@/lib/portal-admin.functions";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
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
  const { data, isLoading } = useQuery({
    queryKey: ["portal-overview"],
    queryFn: () => fn({ data: {} } as never),
  });

  const installs = data?.installs ?? [];
  const active = installs.filter(
    (i) => i.install_license && !i.install_license.revoked && !i.install_license.suspended,
  ).length;
  const modules = installs.reduce((s, i) => s + i.module_licenses.length, 0);
  const nextMaint = installs
    .map((i) => i.install_license?.maintenance_expires_at)
    .filter((d): d is string => !!d)
    .sort()[0];

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <PageHeader
        eyebrow="Customer portal"
        title="Overview"
        description={data?.email ? `Signed in as ${data.email}` : "Your OPSQAI Customer Portal"}
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatCard label="Active installations" value={active} icon={Package} />
        <StatCard label="Module licenses" value={modules} icon={FileText} />
        <StatCard label="Next maintenance renewal" value={fmt(nextMaint)} icon={Download} />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : installs.length === 0 ? (
        <EmptyState
          icon={Inbox}
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
