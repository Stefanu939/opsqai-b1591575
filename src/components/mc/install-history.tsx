import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, History } from "lucide-react";
import { getInstallHistory } from "@/lib/install-history.functions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export function InstallHistoryPanel({ installIds }: { installIds: string[] }) {
  const fetchHistory = useServerFn(getInstallHistory);
  const q = useQuery({
    queryKey: ["install-history", installIds],
    queryFn: () => fetchHistory({ data: { install_ids: installIds } }),
    enabled: installIds.length > 0,
    retry: false,
  });

  if (installIds.length === 0) return null;

  if (q.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading installation history…</p>;
  }

  const rows = q.data ?? [];
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No installation history"
        description="History appears once the customer downloads a package or the installation reports in."
      />
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.install_id} className="rounded-xl border border-border/60 bg-card/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <code className="font-mono text-xs">{row.install_id}</code>
              {row.organization_name ? (
                <span className="text-sm text-muted-foreground">{row.organization_name}</span>
              ) : null}
            </div>
            {row.behind ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Behind — runs v{row.current_version}, current v{row.latest_version}
              </Badge>
            ) : row.current_version ? (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Up to date (v{row.current_version})
              </Badge>
            ) : (
              <Badge variant="outline">Version unknown</Badge>
            )}
          </div>

          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Installer version
              </dt>
              <dd className="mt-0.5">{row.installer_version ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Last download
              </dt>
              <dd className="mt-0.5">
                {row.last_download_at
                  ? formatDistanceToNow(new Date(row.last_download_at), { addSuffix: true })
                  : "Never"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Last heartbeat
              </dt>
              <dd className="mt-0.5">
                {row.last_heartbeat_at
                  ? formatDistanceToNow(new Date(row.last_heartbeat_at), { addSuffix: true })
                  : "Never"}
              </dd>
            </div>
          </dl>

          {row.downloads.length > 0 ? (
            <div className="mt-3 border-t border-border/60 pt-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Downloads ({row.download_count})
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {row.downloads.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2">
                    <span className="tabular-nums text-muted-foreground">
                      {new Date(d.created_at).toLocaleString()}
                    </span>
                    <span>{d.actor_email ?? d.actor_role ?? "—"}</span>
                    {d.actor_role ? (
                      <Badge variant="outline" className="text-[10px]">
                        {d.actor_role}
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
