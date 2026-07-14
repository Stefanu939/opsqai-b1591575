import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPortalOverview } from "@/lib/portal.functions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/subscription")({
  component: PortalSubscription,
});

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function PortalSubscription() {
  const fn = useServerFn(getMyPortalOverview);
  const { data } = useQuery({
    queryKey: ["portal-overview"],
    queryFn: () => fn({ data: {} } as never),
  });

  const installs = data?.installs ?? [];

  return (
    <div className="p-6 md:p-10 max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Customer portal"
        title="Subscription"
        description="Read-only view of the licenses tied to your account. Contact OPSQAI to change seats, activate modules, or renew maintenance."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/portal/support">Contact OPSQAI</Link>
          </Button>
        }
      />

      {installs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No subscription linked yet"
          description="Once your OPSQAI installation is licensed, contract details appear here."
        />
      ) : (
        installs.map((inst) => (
          <Card key={inst.install_id} className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Install</div>
                <div className="font-mono text-sm">{inst.install_id}</div>
                <div className="text-sm font-medium">{inst.company_name}</div>
              </div>
              <Badge variant={inst.owner_type === "customer" ? "default" : "outline"}>
                {inst.owner_type === "customer" ? "Customer-owned" : "OPSQAI-owned"}
              </Badge>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Installation license
              </div>
              {inst.install_license ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Seats</div>
                    <div className="font-medium">{inst.install_license.seats ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Maintenance until</div>
                    <div className="font-medium">{fmt(inst.install_license.maintenance_expires_at)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Expires</div>
                    <div className="font-medium">{fmt(inst.install_license.expires_at)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Status</div>
                    <div className="font-medium">
                      {inst.install_license.revoked
                        ? "Revoked"
                        : inst.install_license.suspended
                          ? "Suspended"
                          : "Active"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Not yet issued</div>
              )}
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Module licenses
              </div>
              {inst.module_licenses.length ? (
                <div className="rounded-md border border-border divide-y divide-border text-sm">
                  {inst.module_licenses.map((m) => (
                    <div
                      key={m.module_key}
                      className="px-3 py-2 flex items-center justify-between flex-wrap gap-2"
                    >
                      <span className="font-mono text-xs">{m.module_key}</span>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>maint: {fmt(m.maintenance_expires_at)}</span>
                        <span>exp: {fmt(m.expires_at)}</span>
                        <span>
                          {m.revoked ? "Revoked" : m.suspended ? "Suspended" : "Active"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No premium modules yet. Request activation via support.
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
