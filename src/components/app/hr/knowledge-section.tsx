// OPSQAI HR — HR Knowledge: searchable internal articles (tags, categories, country).
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Library, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteHrKnowledge, saveHrKnowledge } from "@/lib/hr-ws.functions";
import type { HrKnowledgeArticle } from "@/lib/hr/types-ws";
import type { HrWsUi } from "@/i18n/pages/hr-ws";
import { useHrKnowledge } from "./use-hr-ws";
import { useHrExtRefresh } from "./use-hr-ext";
import { Field, fmtDate } from "./shared";

type Draft = { id?: string; title: string; category: string; body: string; tags: string };

export function KnowledgeSection({ w }: { w: HrWsUi }) {
  const [term, setTerm] = useState("");
  const query = useHrKnowledge(term.trim() || undefined);
  const refresh = useHrExtRefresh();
  const save = useServerFn(saveHrKnowledge);
  const remove = useServerFn(deleteHrKnowledge);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openArticle, setOpenArticle] = useState<HrKnowledgeArticle | null>(null);

  if (query.isPending && !query.data) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) return <EmptyState title={w.knowledge} description={(query.error as Error).message} />;
  const data = query.data!;
  const can = (g: string) => data.grants.includes(g as never);
  const categories = [...new Set(data.articles.map((a) => a.category))];

  return (
    <div className="grid gap-6">
      <Panel
        icon={Library}
        title={w.knowledge}
        actions={
          <div className="flex items-center gap-2">
            <Input className="h-8 w-56" placeholder={w.search} value={term} onChange={(e) => setTerm(e.target.value)} />
            {can("create") ? (
              <Button size="sm" onClick={() => setDraft({ title: "", category: categories[0] ?? "general", body: "", tags: "" })}>
                <Plus className="mr-1.5 size-4" /> {w.newArticle}
              </Button>
            ) : null}
          </div>
        }
      >
        {data.articles.length === 0 ? (
          <EmptyState title={w.noKnowledge} description={w.noKnowledgeBody} />
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {data.articles.map((a) => (
              <button
                key={a.id}
                type="button"
                className="rounded-lg border border-border/60 bg-card/50 p-3 text-left transition hover:border-primary/60"
                onClick={() => setOpenArticle(a)}
              >
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">{a.category}</Badge>
                  {a.country ? <Badge variant="secondary">{a.country.toUpperCase()}</Badge> : null}
                </div>
                <p className="mt-1.5 text-sm font-medium">{a.title}</p>
                <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{a.body}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.tags.map((t) => (
                    <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">#{t}</span>
                  ))}
                  <span className="ml-auto text-[10px] text-muted-foreground">{fmtDate(a.updated_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Dialog open={Boolean(openArticle)} onOpenChange={(o) => !o && setOpenArticle(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{openArticle?.title}</DialogTitle>
          </DialogHeader>
          <article className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">{openArticle?.body}</article>
          <DialogFooter>
            {openArticle && can("delete") ? (
              <Button variant="ghost" className="mr-auto text-destructive" onClick={() => void remove({ data: { id: openArticle.id } }).then(() => { setOpenArticle(null); void refresh(); })}>
                <Trash2 className="mr-1.5 size-4" /> {w.archive}
              </Button>
            ) : null}
            {openArticle && can("edit") ? (
              <Button variant="outline" onClick={() => { setDraft({ id: openArticle.id, title: openArticle.title, category: openArticle.category, body: openArticle.body, tags: openArticle.tags.join(", ") }); setOpenArticle(null); }}>
                {w.editDraft}
              </Button>
            ) : null}
            <Button onClick={() => setOpenArticle(null)}>{w.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(draft)} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? w.editDraft : w.newArticle}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={w.taskTitle} className="sm:col-span-2">
                  <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                </Field>
                <Field label={w.category}>
                  <Input value={draft.category} list="hr-kb-cats" onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
                  <datalist id="hr-kb-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                </Field>
              </div>
              <Textarea className="min-h-72" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              <Field label={`${w.tags} · ${w.tagsHint}`}>
                <Input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
              </Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>{w.close}</Button>
            <Button
              disabled={!draft?.title.trim() || !draft?.category.trim()}
              onClick={() =>
                draft &&
                void save({
                  data: {
                    id: draft.id,
                    title: draft.title.trim(),
                    category: draft.category.trim(),
                    body: draft.body,
                    tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20),
                  },
                })
                  .then(() => { toast.success(w.created); setDraft(null); void refresh(); })
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              {w.saveDraft}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
