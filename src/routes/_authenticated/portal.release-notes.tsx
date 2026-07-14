import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPortalReleases } from "@/lib/portal.functions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ExternalLink, Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/release-notes")({
  component: PortalReleaseNotes,
});

function PortalReleaseNotes() {
  const fn = useServerFn(listPortalReleases);
  const { data } = useQuery({
    queryKey: ["portal-releases"],
    queryFn: () => fn({ data: {} } as never),
  });

  const rows = data ?? [];

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <PageHeader
        eyebrow="Customer portal"
        title="Release notes"
        description="Signed release manifest for OPSQAI installer versions available to your installations."
      />

      {rows.length === 0 ? (
        <EmptyState icon={Package} title="No releases published yet" />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={`${r.channel}-${r.version}`} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-display font-semibold">v{r.version}</span>
                    <Badge variant="outline">{r.channel}</Badge>
                    {r.is_current ? <Badge>current</Badge> : null}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Published {r.published_at ? new Date(r.published_at).toLocaleDateString() : "—"}
                    {r.min_supported ? ` · min supported: v${r.min_supported}` : ""}
                  </div>
                </div>
                {r.release_notes_url ? (
                  <a
                    href={r.release_notes_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline flex items-center gap-1"
                  >
                    Notes <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
              <div className="mt-3 text-xs font-mono break-all text-muted-foreground">
                {r.docker_image}
                {r.checksum ? <div>sha256: {r.checksum}</div> : null}
              </div>
            </Card>
          ))}
          {rows.length === 0 && <EmptyState icon={Inbox} title="No releases yet" />}
        </div>
      )}
    </div>
  );
}
