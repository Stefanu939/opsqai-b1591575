import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPortalOverview } from "@/lib/portal.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/contract")({
  component: PortalContract,
});

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function PortalContract() {
  const fn = useServerFn(getMyPortalOverview);
  const { data } = useQuery({
    queryKey: ["portal-overview"],
    queryFn: () => fn({ data: {} } as never),
  });

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <FileText className="h-7 w-7" /> Contract
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Read-only view of the licenses tied to your account. Contact OPSQAI to change seats or
          renew maintenance.
        </p>
      </header>

      {(data?.installs ?? []).map((inst) => (
        <Card key={inst.install_id} className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Install</div>
              <div className="font-mono text-sm">{inst.install_id}</div>
              <div className="text-sm">{inst.company_name}</div>
            </div>
            <Badge variant={inst.owner_type === "customer" ? "default" : "outline"}>
              {inst.owner_type === "customer" ? "Customer-owned" : "OPSQAI-owned"}
            </Badge>
          </div>

          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1">Installation license</div>
            {inst.install_license ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><div className="text-muted-foreground text-xs">Seats</div>{inst.install_license.seats ?? "—"}</div>
                <div><div className="text-muted-foreground text-xs">Maintenance until</div>{fmt(inst.install_license.maintenance_expires_at)}</div>
                <div><div className="text-muted-foreground text-xs">Expires</div>{fmt(inst.install_license.expires_at)}</div>
                <div><div className="text-muted-foreground text-xs">Status</div>{inst.install_license.revoked ? "Revoked" : inst.install_license.suspended ? "Suspended" : "Active"}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Not yet issued</div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1">Module licenses</div>
            {inst.module_licenses.length ? (
              <div className="rounded-md border divide-y text-sm">
                {inst.module_licenses.map((m) => (
                  <div key={m.module_key} className="px-3 py-2 flex items-center justify-between">
                    <span className="font-mono text-xs">{m.module_key}</span>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>maint: {fmt(m.maintenance_expires_at)}</span>
                      <span>exp: {fmt(m.expires_at)}</span>
                      <span>{m.revoked ? "Revoked" : m.suspended ? "Suspended" : "Active"}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">None</div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
