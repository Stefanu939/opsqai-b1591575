import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPortalOverview } from "@/lib/portal.functions";
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

function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  return Math.round((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function MaintenanceRing({
  daysLeft,
  totalDays = 365,
}: {
  daysLeft: number;
  totalDays?: number;
}) {
  const clamped = Math.max(0, Math.min(daysLeft, totalDays));
  const pct = clamped / totalDays;
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const stroke =
    daysLeft <= 0
      ? "hsl(var(--destructive))"
      : daysLeft < 30
        ? "#e0a800"
        : "var(--gold)";
  return (
    <div className="relative shrink-0" style={{ width: 104, height: 104 }}>
      <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
        <circle cx="52" cy="52" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="52"
          cy="52"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-display font-semibold tabular-nums leading-none">
          {daysLeft <= 0 ? "0" : daysLeft}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
          {daysLeft <= 0 ? "expired" : "days left"}
        </div>
      </div>
    </div>
  );
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
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
            Customer portal
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Subscription
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Read-only view of the licenses tied to your account. Contact OPSQAI to change seats,
            activate modules, or renew maintenance.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/portal/support">Contact OPSQAI</Link>
        </Button>
      </div>

      {installs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No subscription linked yet"
          description="Once your OPSQAI installation is licensed, contract details appear here."
        />
      ) : (
        installs.map((inst) => {
          const days = daysUntil(inst.install_license?.maintenance_expires_at);
          return (
            <Card key={inst.install_id} className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-5 items-center min-w-0">
                  {days !== null && <MaintenanceRing daysLeft={days} />}
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Install
                    </div>
                    <div className="font-mono text-sm truncate">{inst.install_id}</div>
                    <div className="text-base font-medium mt-0.5">{inst.company_name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Maintenance until {fmt(inst.install_license?.maintenance_expires_at)}
                    </div>
                  </div>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm rounded-lg border border-border bg-muted/20 p-4">
                    <div>
                      <div className="text-muted-foreground text-xs">Seats</div>
                      <div className="font-medium tabular-nums">{inst.install_license.seats ?? "—"}</div>
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
                  <div className="rounded-lg border border-border divide-y divide-border text-sm overflow-hidden">
                    {inst.module_licenses.map((m) => (
                      <div
                        key={m.module_key}
                        className="px-3 py-2 flex items-center justify-between flex-wrap gap-2 hover:bg-muted/30 transition-colors"
                      >
                        <span className="font-mono text-xs">{m.module_key}</span>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>maint: {fmt(m.maintenance_expires_at)}</span>
                          <span>exp: {fmt(m.expires_at)}</span>
                          <span
                            className={
                              m.revoked
                                ? "text-destructive font-medium"
                                : m.suspended
                                  ? "text-amber-600 font-medium"
                                  : "text-emerald-600 font-medium"
                            }
                          >
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
          );
        })
      )}
    </div>
  );
}

