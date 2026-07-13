import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSystemDoc } from "@/lib/system-docs.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/internal/knowledge/$slug")({
  component: SystemDocPage,
});

type Doc = {
  slug: string;
  title: string;
  category: string;
  body_md: string;
  related_slugs: string[];
  updated_at: string;
};

function SystemDocPage() {
  const { slug } = Route.useParams();
  const get = useServerFn(getSystemDoc);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setDoc(null);
    setErr(null);
    get({ data: { slug } })
      .then((d) => setDoc(d as Doc))
      .catch((e) => setErr(String(e)));
  }, [slug]);

  return (
    <div className="max-w-3xl mx-auto w-full p-6 space-y-4">
      <Link
        to="/app/internal/knowledge"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ChevronLeft className="h-4 w-4" /> Back to System Knowledge
      </Link>
      {err && <Card className="p-4 text-sm text-destructive">{err}</Card>}
      {!doc && !err && <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>}
      {doc && (
        <>
          <div>
            <Badge variant="outline" className="mb-2">
              {doc.category}
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">{doc.slug}</div>
          </div>
          <Card className="p-6">
            <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {doc.body_md}
            </article>
          </Card>
          {doc.related_slugs.length > 0 && (
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Related
              </div>
              <ul className="space-y-1 text-sm">
                {doc.related_slugs.map((s) => (
                  <li key={s}>
                    <Link
                      to="/app/internal/knowledge/$slug"
                      params={{ slug: s }}
                      className="text-primary hover:underline font-mono text-[12px]"
                    >
                      {s}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
