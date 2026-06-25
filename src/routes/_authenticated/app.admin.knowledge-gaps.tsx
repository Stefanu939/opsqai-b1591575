import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listKnowledgeGaps, updateKnowledgeGap, deleteKnowledgeGap,
} from "@/lib/knowledge-gaps.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BookOpen, FileText, Check, X, Trash2, Loader2, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/knowledge-gaps")({
  head: () => ({ meta: [{ title: "Knowledge Gaps — OPSQAI" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ gap: typeof s.gap === "string" ? s.gap : undefined }),
  component: Page,
});

interface Gap {
  id: string;
  question_sample: string;
  occurrences: number;
  first_seen: string;
  last_seen: string;
  status: string;
  confidence: number | null;
  department_name: string | null;
  created_by_name: string | null;
  resolution_date: string | null;
  resolved_document: { id: string; title: string; doc_code: string | null } | null;
  resolved_faq: { id: string; question_en: string | null } | null;
}

type Filter = "open" | "in_progress" | "resolved" | "ignored" | "all";

function confLabel(c: number | null): { label: string; cls: string } {
  if (c == null) return { label: "—", cls: "text-muted-foreground" };
  const pct = Math.round(c * 100);
  if (c >= 0.7) return { label: `${pct}% High`, cls: "text-emerald-600 dark:text-emerald-400" };
  if (c >= 0.45) return { label: `${pct}% Medium`, cls: "text-amber-600 dark:text-amber-400" };
  return { label: `${pct}% Low`, cls: "text-red-600 dark:text-red-400" };
}

function Page() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/app/admin/knowledge-gaps" });
  const list = useServerFn(listKnowledgeGaps);
  const update = useServerFn(updateKnowledgeGap);
  const remove = useServerFn(deleteKnowledgeGap);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("open");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { gaps } = await list();
      setGaps(gaps as unknown as Gap[]);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (search.gap) {
      const el = document.getElementById(`gap-${search.gap}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [search.gap, gaps]);

  const visible = useMemo(
    () => gaps.filter((g) => filter === "all" || g.status === filter),
    [gaps, filter],
  );

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try { await fn(); await load(); } finally { setBusyId(null); }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Gaps</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Questions your AI couldn't answer confidently. Resolve them by creating an SOP or FAQ.
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="ignored">Ignored</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading…
        </Card>
      ) : visible.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          No {filter !== "all" ? filter.replace("_", " ") : ""} knowledge gaps. 🎉
        </Card>
      ) : (
        <div className="grid gap-3">
          {visible.map((g) => {
            const cf = confLabel(g.confidence);
            const isOpen = g.status === "open" || g.status === "in_progress";
            const highlight = search.gap === g.id;
            return (
              <Card
                id={`gap-${g.id}`}
                key={g.id}
                className={`p-4 transition ${highlight ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge
                        variant={
                          g.status === "open" ? "destructive" :
                          g.status === "in_progress" ? "default" :
                          g.status === "resolved" ? "secondary" : "outline"
                        }
                        className="text-[10px] capitalize"
                      >
                        {g.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="secondary" className="font-mono text-[10px]">×{g.occurrences}</Badge>
                      <span className={`text-[10px] font-medium ${cf.cls}`}>Confidence: {cf.label}</span>
                      {g.department_name && (
                        <Badge variant="outline" className="text-[10px]">{g.department_name}</Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        First seen {new Date(g.first_seen).toLocaleDateString()} · last {new Date(g.last_seen).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{g.question_sample}</p>
                    {g.status === "resolved" && (g.resolved_document || g.resolved_faq) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Resolved by:{" "}
                        {g.resolved_document
                          ? `${g.resolved_document.doc_code ?? ""} ${g.resolved_document.title}`.trim()
                          : g.resolved_faq?.question_en ?? "FAQ"}
                        {g.resolution_date && ` · ${new Date(g.resolution_date).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {isOpen && (
                    <>
                      <Button size="sm" variant="outline" disabled={busyId === g.id}
                        onClick={() => navigate({ to: "/app/knowledge", search: { gap: g.question_sample } as never })}>
                        <FileText className="h-3.5 w-3.5 mr-1.5" /> Create SOP
                      </Button>
                      <Button size="sm" variant="outline" disabled={busyId === g.id}
                        onClick={() => navigate({ to: "/app/faq", search: { gap: g.question_sample } as never })}>
                        <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Create FAQ
                      </Button>
                      {g.status === "open" && (
                        <Button size="sm" variant="ghost" disabled={busyId === g.id}
                          onClick={() => run(g.id, () => update({ data: { id: g.id, status: "in_progress" } }))}>
                          <PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Mark In Progress
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={busyId === g.id}
                        onClick={() => run(g.id, () => update({ data: { id: g.id, status: "resolved", resolution: "dismissed" } }))}>
                        <Check className="h-3.5 w-3.5 mr-1.5" /> Mark Resolved
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyId === g.id}
                        onClick={() => run(g.id, () => update({ data: { id: g.id, status: "ignored", resolution: "dismissed" } }))}>
                        <X className="h-3.5 w-3.5 mr-1.5" /> Ignore
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost"
                    className="text-destructive hover:text-destructive ml-auto"
                    disabled={busyId === g.id}
                    onClick={() => {
                      if (confirm("Delete this knowledge gap?")) {
                        run(g.id, () => remove({ data: { id: g.id } }));
                      }
                    }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
