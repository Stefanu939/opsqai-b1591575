// Management Center → Usage audit index: pick an installation to audit.
// Numbers only; the per-install screen never shows customer content.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSelfHostFleet, type SelfHostFleetRow } from "@/lib/selfhost-fleet.functions";
import { statusBadgeVariant, statusLabel } from "@/lib/selfhost-status";
import { ModulePage } from "@/components/app/module-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Clock, Server, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/management/usage/")({
  head: () => ({
    meta: [
      { title: "Usage audit — Management Center" },
      {
        name: "description",
        content:
          "Pick a self-hosted OPSQAI installation to review its aggregate usage audit: adoption, time in app, AI usage, deadlines and availability.",
      },
      { property: "og:title", content: "Usage audit — Management Center" },
      {
        property: "og:description",
        content: "Aggregate-only usage audit per self-hosted installation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsageIndexPage,
});

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  degraded: "bg-amber-500",
  offline: "bg-red-500",
  unknown: "bg-muted-foreground/40",
};

function UsageIndexPage() {
  const fetchFleet = useServerFn(listSelfHostFleet);
  const query = useQuery({
    queryKey: ["mc-usage-fleet"],
    queryFn: () => fetchFleet() as Promise<SelfHostFleetRow[]>,
    refetchInterval: 60_000,
  });
  const rows = query.data ?? [];

  return (
    <ModulePage
      eyebrow="Management Center"
      title="Usage audit"
      description="How much and how each self-hosted installation is used, measured from aggregate counters only. No customer documents, names, messages or personal data are transmitted or shown."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Numbers only
        </Badge>
        <span className="text-sm text-muted-foreground">{rows.length} installations</span>
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No installation has reported yet. Once an installation sends its scheduled report, it
          appears here.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <div
              key={r.install_id}
              className="group flex flex-col rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
            >
              <div className="flex items-start gap-3 p-4 pb-3">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BarChart3 className="h-5 w-5" />
                  <span
                    className={cn(
                      "absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card",
                      STATUS_DOT[r.display_status] ?? STATUS_DOT.unknown,
                    )}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-foreground">
                    {r.organization_name ?? "Unnamed installation"}
                  </div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">
                    {r.install_id}
                  </div>
                </div>
                <Badge variant={statusBadgeVariant(r.display_status)}>
                  {statusLabel(r.display_status)}
                </Badge>
              </div>

              <div className="flex items-center gap-4 border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5" />
                  <span className="font-mono">v{r.app_version ?? "?"}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {r.last_heartbeat_at
                    ? r.last_heartbeat_at.slice(0, 16).replace("T", " ")
                    : "never reported"}
                </span>
              </div>

              <div className="mt-auto border-t border-border/60 p-3">
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to="/management/usage/$installId" params={{ installId: r.install_id }}>
                    Open audit
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModulePage>
  );
}
