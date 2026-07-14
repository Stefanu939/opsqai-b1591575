import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listPortalDocs, getPortalDoc } from "@/lib/portal.functions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookOpen, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/documentation")({
  component: PortalDocumentation,
});

function PortalDocumentation() {
  const listFn = useServerFn(listPortalDocs);
  const getFn = useServerFn(getPortalDoc);
  const [q, setQ] = useState("");
  const [slug, setSlug] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["portal-docs"],
    queryFn: () => listFn({ data: {} } as never),
  });

  const doc = useQuery({
    queryKey: ["portal-doc", slug],
    queryFn: () => getFn({ data: { slug: slug! } }),
    enabled: !!slug,
  });

  const grouped = useMemo(() => {
    const rows = list.data ?? [];
    const term = q.trim().toLowerCase();
    const filtered = term
      ? rows.filter(
          (r) =>
            r.title.toLowerCase().includes(term) || r.category.toLowerCase().includes(term),
        )
      : rows;
    const byCat = new Map<string, typeof filtered>();
    for (const r of filtered) {
      if (!byCat.has(r.category)) byCat.set(r.category, []);
      byCat.get(r.category)!.push(r);
    }
    return Array.from(byCat.entries());
  }, [list.data, q]);

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <PageHeader
        eyebrow="Customer portal"
        title="Documentation"
        description="Product documentation for OPSQAI features, modules and operations."
      />

      <div className="grid md:grid-cols-[320px_1fr] gap-4">
        <Card className="p-0 overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="pl-8"
              />
            </div>
          </div>
          {list.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : grouped.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={BookOpen} title="No documentation available" />
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {grouped.map(([cat, items]) => (
                <div key={cat} className="border-b border-border last:border-b-0">
                  <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground bg-surface-1">
                    {cat}
                  </div>
                  <ul>
                    {items.map((it) => (
                      <li key={it.slug}>
                        <button
                          onClick={() => setSlug(it.slug)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/40 transition-colors ${slug === it.slug ? "bg-accent font-medium" : ""}`}
                        >
                          {it.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 min-h-[500px]">
          {!slug ? (
            <div className="text-sm text-muted-foreground">
              Select a document from the list to read it.
            </div>
          ) : doc.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : !doc.data ? (
            <EmptyState icon={BookOpen} title="Document not found" />
          ) : (
            <article className="prose prose-sm max-w-none dark:prose-invert">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                {doc.data.category}
              </div>
              <h1 className="font-display text-2xl font-semibold mb-4">{doc.data.title}</h1>
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
                {doc.data.body_md}
              </pre>
              <div className="mt-6 text-xs text-muted-foreground">
                Updated {new Date(doc.data.updated_at).toLocaleDateString()}
              </div>
            </article>
          )}
        </Card>
      </div>
    </div>
  );
}
