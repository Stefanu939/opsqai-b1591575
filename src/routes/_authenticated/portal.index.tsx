import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPortalOverview } from "@/lib/portal.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: PortalHome,
});

function PortalHome() {
  const fn = useServerFn(getMyPortalOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["portal-overview"],
    queryFn: () => fn({ data: {} } as never),
  });

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data?.email ? `Signed in as ${data.email}` : "Your OPSQAI Customer Portal"}
        </p>
      </header>

      {isLoading ? <div className="text-muted-foreground">Loading…</div> : null}

      {data && data.installs.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            No installations linked to this email yet. If you expect to see one, contact OPSQAI support.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.installs.map((inst) => {
          const maint = inst.install_license?.maintenance_expires_at;
          const seats = inst.install_license?.seats;
          return (
            <Card key={inst.install_id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Install</div>
                  <div className="font-mono text-sm">{inst.install_id}</div>
                  <div className="text-sm mt-1">{inst.company_name}</div>
                </div>
                <Badge variant={inst.owner_type === "customer" ? "default" : "outline"}>
                  {inst.owner_type === "customer" ? "Customer-owned" : "OPSQAI-owned"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Seats</div>
                  <div className="font-medium">{seats ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Maintenance until</div>
                  <div className="font-medium">{maint ? new Date(maint).toLocaleDateString() : "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Modules</div>
                  <div className="font-medium">{inst.module_licenses.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-medium">
                    {inst.install_license?.revoked
                      ? "Revoked"
                      : inst.install_license?.suspended
                      ? "Suspended"
                      : inst.install_license
                      ? "Active"
                      : "Pending"}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
