import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAnnouncement, signPortalStoragePath } from "@/lib/portal-admin.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pin, Newspaper } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/news/$slug")({
  component: PortalNewsDetail,
});

function PortalNewsDetail() {
  const { slug } = Route.useParams();
  const get = useServerFn(getAnnouncement);
  const sign = useServerFn(signPortalStoragePath);
  const { data, isLoading } = useQuery({
    queryKey: ["portal-announcement", slug],
    queryFn: () => get({ data: { slug } } as never),
  });

  const [cover, setCover] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      if (!data?.cover_image_url) {
        setCover(null);
        return;
      }
      if (data.cover_image_url.startsWith("portal-news-images/")) {
        try {
          const { url } = await sign({
            data: {
              bucket: "portal-news-images",
              path: data.cover_image_url.slice("portal-news-images/".length),
              expiresIn: 3600,
            },
          });
          setCover(url);
        } catch {
          setCover(null);
        }
      } else {
        setCover(data.cover_image_url);
      }
    })();
  }, [data, sign]);

  if (isLoading) {
    return <div className="p-6 md:p-10 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!data || data.status !== "published") {
    return (
      <div className="p-6 md:p-10 max-w-3xl">
        <div className="text-center py-12">
          <Newspaper className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Post not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/portal/news">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to news
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <article className="p-6 md:p-10 max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/portal/news">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to news
        </Link>
      </Button>

      {cover && (
        <img
          src={cover}
          alt=""
          className="w-full max-h-[360px] object-cover rounded-lg mb-6 bg-muted"
        />
      )}

      <div className="flex items-center gap-2 flex-wrap mb-2">
        {data.pinned && (
          <Badge variant="secondary">
            <Pin className="h-3 w-3 mr-1" />
            pinned
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {data.published_at ? new Date(data.published_at).toLocaleDateString() : ""}
        </span>
      </div>

      <h1 className="text-3xl font-display font-bold mb-6">{data.title}</h1>

      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.body_md}</ReactMarkdown>
      </div>
    </article>
  );
}
