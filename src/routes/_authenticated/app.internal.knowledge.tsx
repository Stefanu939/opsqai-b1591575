import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listSystemDocs } from "@/lib/system-docs.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/internal/knowledge")({
  component: SystemKnowledge,
  head: () => ({ meta: [{ title: "System Knowledge · OPSQAI Internal" }] }),
});

type Doc = { id: string; title: string; category: string; system_slug: string; updated_at: string; chunk_count: number };

function SystemKnowledge() {
  const list = useServerFn(listSystemDocs);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    list().then((d) => setDocs(d as Doc[])).finally(() => setLoading(false));
  }, []);

  const filtered = docs.filter((d) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return d.title.toLowerCase().includes(needle) || d.category.toLowerCase().includes(needle) || d.system_slug.toLowerCase().includes(needle);
  });
  const grouped = filtered.reduce<Record<string, Doc[]>>((acc, d) => {
    (acc[d.category] ||= []).push(d);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto w-full p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System Knowledge</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Auto-generated OPSQAI platform documentation. Read-only.
        </p>
      </div>
      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search docs…" className="pl-9" />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : docs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No system documents yet. Go to <Link to="/app/internal" className="text-primary underline">Overview</Link> and click <strong>Regenerate</strong>.
        </Card>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{category}</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {items.map((d) => (
                <Link key={d.id} to="/app/internal/knowledge/$slug" params={{ slug: d.system_slug }}>
                  <Card className="p-4 hover:border-primary/40 transition flex items-start gap-3">
                    <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{d.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">{d.system_slug}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">{d.chunk_count}</Badge>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
