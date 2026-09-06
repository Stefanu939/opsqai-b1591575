import { ModulePage } from "@/components/app/module-page";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyInstallStatus, getMyDownloadLog } from "@/lib/install-history.functions";

import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, FileArchive, History, Inbox, KeyRound } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/portal/downloads")({
  component: PortalDownloads,
  head: () => ({
    meta: [
      { title: "Download history — OPSQAI Customer Portal" },
      {
        name: "description",
        content:
          "History of the OPSQAI installation packages and activation keys downloaded for your installations, with the version currently running.",
      },
      { property: "og:title", content: "Download history — OPSQAI Customer Portal" },
      {
        property: "og:description",
        content: "See which OPSQAI versions were downloaded and what your installation runs today.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PortalDownloads() {
  const statusFn = useServerFn(getMyInstallStatus);
  const logFn = useServerFn(getMyDownloadLog);

  const { data: status, isLoading } = useQuery({
    queryKey: ["my-install-status"],
    queryFn: () => statusFn({ data: {} } as never),
    retry: false,
  });
  const { data: log = [] } = useQuery({
    queryKey: ["my-download-log"],
    queryFn: () => logFn({ data: {} } as never),
    retry: false,
  });

  const installs = status?.installs ?? [];

  return (
    <ModulePage
      eyebrow="Customer portal"
      title="Download history"
      description="A record of every installation package and activation key downloaded for your installations. Downloads themselves happen on the Installation page."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your history…</p>
      ) : installs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No installations tied to your account"
          description="History appears once an OPSQAI installation is linked to your email."
        />
      ) : (
        <div className="space-y-6">
          {installs.map((inst) => {
            const rows = log.filter((r) => r.install_id === inst.install_id);
            return (
              <section key={inst.install_id} className="space-y-3">
                <Card className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm">{inst.install_id}</div>
                      {inst.company_name ? (
                        <div className="text-xs text-muted-foreground">{inst.company_name}</div>
                      ) : null}
                    </div>
                    {inst.behind ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Runs v{inst.current_version} — v{inst.latest_version} available
                      </Badge>
                    ) : inst.current_version ? (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Up to date (v{inst.current_version})
                      </Badge>
                    ) : (
                      <Badge variant="outline">Version not reported yet</Badge>
                    )}
                  </div>
                  {inst.behind ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Get the newer version from the{" "}
                      <Link
                        to="/portal/installation"
                        className="underline underline-offset-4 hover:no-underline"
                      >
                        Installation page
                      </Link>
                      .
                    </p>
                  ) : null}
                </Card>

                {rows.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title="Nothing downloaded yet"
                    description="Each download made from the Installation page is listed here."
                  />
                ) : (
                  <Card className="divide-y divide-border/60">
                    {rows.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {r.kind === "activation_key" ? (
                            <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <FileArchive className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="text-sm">
                            {r.kind === "activation_key" ? "Activation key" : "Installation package"}
                          </span>
                          {r.version ? <Badge variant="outline">v{r.version}</Badge> : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {r.actor_email ? <span>{r.actor_email}</span> : null}
                          <span className="tabular-nums">
                            {new Date(r.created_at).toLocaleString()} ·{" "}
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </Card>
                )}
              </section>
            );
          })}
        </div>
      )}
    </ModulePage>
  );
}
