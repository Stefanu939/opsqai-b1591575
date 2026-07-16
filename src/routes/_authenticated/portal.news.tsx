import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listAnnouncementsPublic, signPortalStoragePath } from "@/lib/portal-admin.functions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Newspaper, Pin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/news")({
  component: PortalNews,
});

function PortalNews() {
  const list = useServerFn(listAnnouncementsPublic);
  const sign = useServerFn(signPortalStoragePath);
  const { data = [], isLoading } = useQuery({
    queryKey: ["portal-announcements-public"],
    queryFn: () => list({ data: {} } as never),
  });

  const [covers, setCovers] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const out: Record<string, string> = {};
      for (const r of data) {
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
  }, [data, sign]);

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <PageHeader
        eyebrow="Customer portal"
        title="News"
        description="Latest announcements and updates from OPSQAI."
      />
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : data.length === 0 ? (
        <EmptyState icon={Newspaper} title="No news yet" />
      ) : (
        <div className="grid gap-4">
          {data.map((r) => (
            <Link
              key={r.id}
              to="/portal/news/$slug"
              params={{ slug: r.slug }}
              className="block"
            >
              <Card className="p-4 flex gap-4 hover:bg-accent/40 transition-colors">
                {covers[r.id] ? (
                  <img
                    src={covers[r.id]}
                    alt=""
                    className="w-32 h-32 rounded-md object-cover shrink-0 bg-muted"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-md bg-muted shrink-0 flex items-center justify-center text-muted-foreground">
                    <Newspaper className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-display font-semibold">{r.title}</h2>
                    {r.pinned && (
                      <Badge variant="secondary">
                        <Pin className="h-3 w-3 mr-1" />
                        pinned
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.published_at ? new Date(r.published_at).toLocaleDateString() : ""}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                    {r.body_md.slice(0, 280)}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
