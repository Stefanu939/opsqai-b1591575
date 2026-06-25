import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listKnowledgeGaps, updateKnowledgeGap } from "@/lib/knowledge-gaps.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowUpRight, BookOpen, FileText, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/knowledge-gaps")({
  head: () => ({ meta: [{ title: "Knowledge Gaps — OPSQAI" }] }),
  component: Page,
});

interface Gap {
  id: string;
  question_sample: string;
  occurrences: number;
  first_seen: string;
  last_seen: string;
  status: string;
}

function Page() {
  const navigate = useNavigate();
  const list = useServerFn(listKnowledgeGaps);
  const update = useServerFn(updateKnowledgeGap);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "assigned" | "closed">("open");

  const load = async () => {
    const { gaps } = await list();
    setGaps(gaps as Gap[]);
  };
  useEffect(() => { load(); }, []);

  const visible = gaps.filter((g) => filter === "all" || g.status === filter);

  const close = async (id: string) => {
    await update({ data: { id, status: "closed", resolution: "dismissed" } });
    load();
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Gaps</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Questions your AI couldn't answer. Resolve them by creating an SOP or FAQ.
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          No {filter !== "all" ? filter : ""} knowledge gaps. 🎉
        </Card>
      ) : (
        <div className="grid gap-3">
          {visible.map((g) => (
            <Card key={g.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant="secondary" className="font-mono text-[10px]">×{g.occurrences}</Badge>
                    <Badge variant={g.status === "open" ? "destructive" : g.status === "assigned" ? "default" : "outline"} className="text-[10px]">
                      {g.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      First seen {new Date(g.first_seen).toLocaleDateString()} · last {new Date(g.last_seen).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{g.question_sample}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              {g.status !== "closed" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate({ to: "/app/knowledge", search: { gap: g.question_sample } as never })}>
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> Create SOP
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate({ to: "/app/faq", search: { gap: g.question_sample } as never })}>
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Create FAQ
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => close(g.id)}>
                    <X className="h-3.5 w-3.5 mr-1.5" /> Dismiss
                  </Button>
                </div>
              )}
              {g.status === "closed" && (
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> Closed
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
