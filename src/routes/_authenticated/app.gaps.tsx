import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listKnowledgeGaps,
  getKnowledgeGapStats,
  updateKnowledgeGap,
  deleteKnowledgeGap,
} from "@/lib/knowledge-gaps.functions";
import { draftGapDocument, publishGapDocument } from "@/lib/gap-drafts.functions";
import { ModulePage } from "@/components/app/module-page";
import { MetricTile } from "@/components/ui/metric-tile";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BrainCircuit,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  MessageSquareQuote,
  Trash2,
  TrendingUp,
} from "lucide-react";

type SopDraft = { kind: "sop"; title: string; category: string; markdown: string };
type FaqDraft = {
  kind: "faq";
  category: string;
  question_en: string;
  question_de: string;
  answer_en: string;
  answer_de: string;
};
type Draft = SopDraft | FaqDraft;


export const Route = createFileRoute("/_authenticated/app/gaps")({
  head: () => ({
    meta: [
      { title: "Knowledge Gaps — OPSQAI" },
      {
        name: "description",
        content:
          "Questions your team asked that the knowledge base could not answer — triage, assign and close them with a SOP or FAQ.",
      },
      { property: "og:title", content: "Knowledge Gaps — OPSQAI" },
      {
        property: "og:description",
        content: "Triage unanswered questions and close them with a SOP or FAQ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GapsPage,
});

const FILTERS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

function GapsPage() {
  const fetchGaps = useServerFn(listKnowledgeGaps);
  const fetchStats = useServerFn(getKnowledgeGapStats);
  const patchGap = useServerFn(updateKnowledgeGap);
  const removeGap = useServerFn(deleteKnowledgeGap);
  const qc = useQueryClient();

  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");

  const gapsQuery = useQuery({ queryKey: ["knowledge-gaps"], queryFn: () => fetchGaps() });
  const statsQuery = useQuery({
    queryKey: ["knowledge-gap-stats"],
    queryFn: () => fetchStats(),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["knowledge-gaps"] });
    void qc.invalidateQueries({ queryKey: ["knowledge-gap-stats"] });
  };

  const update = useMutation({
    mutationFn: (vars: { id: string; status: "in_progress" | "resolved" | "ignored" }) =>
      patchGap({ data: vars }),
    onSuccess: () => {
      toast.success("Gap updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const destroy = useMutation({
    mutationFn: (id: string) => removeGap({ data: { id } }),
    onSuccess: () => {
      toast.success("Gap removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ---- Gap → AI draft → human review → publish -------------------------
  const makeDraft = useServerFn(draftGapDocument);
  const publishDraft = useServerFn(publishGapDocument);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftGapId, setDraftGapId] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: (vars: {
      kind: "sop" | "faq";
      gapId: string;
      question: string;
      department?: string | null;
    }) =>
      makeDraft({
        data: {
          kind: vars.kind,
          question: vars.question,
          department: vars.department ?? null,
        },
      }),
    onSuccess: (d, vars) => {
      setDraftGapId(vars.gapId);
      setDraft(d as Draft);
    },
    onError: (e: Error) => toast.error(e.message || "Draft generation failed"),
  });

  const approve = useMutation({
    mutationFn: () =>
      publishDraft({ data: { gap_id: draftGapId, draft: draft as NonNullable<Draft> } }),
    onSuccess: (r) => {
      toast.success(r.kind === "sop" ? "SOP published to the knowledge base" : "FAQ published");
      setDraft(null);
      setDraftGapId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Publishing failed"),
  });

  const patchDraft = (patch: Partial<SopDraft> & Partial<FaqDraft>) =>
    setDraft((prev) => (prev ? ({ ...prev, ...patch } as Draft) : prev));


  const gaps = gapsQuery.data?.gaps ?? [];
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return gaps
      .filter((g) => (filter === "all" ? true : g.status === filter))
      .filter((g) => (q ? g.question_sample.toLowerCase().includes(q) : true))
      .sort((a, b) => b.occurrences - a.occurrences);
  }, [gaps, filter, search]);

  const stats = statsQuery.data;

  return (
    <ModulePage
      eyebrow="Knowledge"
      title="Knowledge Gaps"
      description="Questions the AI could not answer from your SOPs and FAQs. Included in the Basic bundle."
      tabs={<SegmentedTabs value={filter} onChange={setFilter} options={FILTERS} />}
      toolbar={
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search gaps…"
          className="max-w-sm"
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <MetricTile
          label="Open gaps"
          value={stats?.open ?? 0}
          icon={BrainCircuit}
          hint="Awaiting a SOP or FAQ"
          tone={stats && stats.open > 0 ? "warning" : "default"}
        />
        <MetricTile
          label="Resolved (30d)"
          value={stats?.resolvedThisMonth ?? 0}
          icon={CheckCircle2}
          tone="success"
          series={stats?.trend?.map((t) => t.count)}
        />
        <MetricTile
          label="Avg. confidence"
          value={`${Math.round((stats?.avgConfidence ?? 0) * 100)}%`}
          icon={Gauge}
          hint="AI confidence when the gap was logged"
        />
        <MetricTile
          label="Avg. time to close"
          value={`${Math.round(stats?.avgResolutionHours ?? 0)}h`}
          icon={Clock}
        />
      </div>

      {stats?.topDepartments?.length ? (
        <Panel title="Most affected departments" className="mb-6">
          <ul className="divide-y divide-border">
            {stats.topDepartments.map((d) => (
              <li key={d.name} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{d.name}</span>
                <span className="tabular-nums text-muted-foreground">{d.count} asks</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {gapsQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No knowledge gaps"
          description="When someone asks the AI something your SOPs and FAQs cannot answer, it shows up here."
        />
      ) : (
        <Panel glass>
          <ul className="divide-y divide-border">
            {visible.map((g) => (
              <li key={g.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{g.question_sample}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{g.status.replace("_", " ")}</Badge>
                    <span className="tabular-nums">{g.occurrences}× asked</span>
                    {g.department_name ? <span>· {g.department_name}</span> : null}
                    <span>· last {new Date(g.last_seen).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {g.status !== "resolved" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={
                          generate.isPending &&
                          generate.variables?.gapId === g.id &&
                          generate.variables?.kind === "sop"
                        }
                        onClick={() =>
                          generate.mutate({
                            kind: "sop",
                            gapId: g.id,
                            question: g.question_sample,
                            department: g.department_name ?? null,
                          })
                        }
                      >
                        <FileText className="mr-1.5 h-4 w-4" />
                        Draft SOP
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={
                          generate.isPending &&
                          generate.variables?.gapId === g.id &&
                          generate.variables?.kind === "faq"
                        }
                        onClick={() =>
                          generate.mutate({
                            kind: "faq",
                            gapId: g.id,
                            question: g.question_sample,
                            department: g.department_name ?? null,
                          })
                        }
                      >
                        <MessageSquareQuote className="mr-1.5 h-4 w-4" />
                        Draft FAQ
                      </Button>
                    </>
                  ) : null}
                  {g.status !== "in_progress" && g.status !== "resolved" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => update.mutate({ id: g.id, status: "in_progress" })}
                    >
                      Take it
                    </Button>
                  ) : null}

                  {g.status !== "resolved" ? (
                    <Button
                      size="sm"
                      onClick={() => update.mutate({ id: g.id, status: "resolved" })}
                    >
                      Mark resolved
                    </Button>
                  ) : null}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete gap"
                    onClick={() => destroy.mutate(g.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Dialog
        open={draft !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDraft(null);
            setDraftGapId(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {draft?.kind === "faq" ? "Review FAQ draft" : "Review SOP draft"}
            </DialogTitle>
            <DialogDescription>
              AI draft based on your existing knowledge base. Edit it, then approve to publish —
              nothing is published without your approval.
            </DialogDescription>
          </DialogHeader>

          {draft?.kind === "sop" ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="draft-title">Title</Label>
                  <Input
                    id="draft-title"
                    value={draft.title}
                    onChange={(e) => patchDraft({ title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="draft-category">Category</Label>
                  <Input
                    id="draft-category"
                    value={draft.category}
                    onChange={(e) => patchDraft({ category: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="draft-markdown">SOP (Markdown)</Label>
                <Textarea
                  id="draft-markdown"
                  className="min-h-[360px] font-mono text-xs"
                  value={draft.markdown}
                  onChange={(e) => patchDraft({ markdown: e.target.value })}
                />
              </div>
            </div>
          ) : draft?.kind === "faq" ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="faq-category">Category</Label>
                <Input
                  id="faq-category"
                  value={draft.category}
                  onChange={(e) => patchDraft({ category: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="faq-q-en">Question (EN)</Label>
                  <Input
                    id="faq-q-en"
                    value={draft.question_en}
                    onChange={(e) => patchDraft({ question_en: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="faq-q-de">Question (DE)</Label>
                  <Input
                    id="faq-q-de"
                    value={draft.question_de}
                    onChange={(e) => patchDraft({ question_de: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="faq-a-en">Answer (EN)</Label>
                  <Textarea
                    id="faq-a-en"
                    className="min-h-[160px]"
                    value={draft.answer_en}
                    onChange={(e) => patchDraft({ answer_en: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="faq-a-de">Answer (DE)</Label>
                  <Textarea
                    id="faq-a-de"
                    className="min-h-[160px]"
                    value={draft.answer_de}
                    onChange={(e) => patchDraft({ answer_de: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDraft(null);
                setDraftGapId(null);
              }}
            >
              Discard
            </Button>
            <Button loading={approve.isPending} onClick={() => approve.mutate()}>
              Approve &amp; publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePage>

  );
}
