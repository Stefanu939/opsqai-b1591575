// Weekly audit: an editable checklist plus the run for the current week.
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarCheck, ListChecks, Plus, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  completeWeeklyCheck,
  deleteChecklistItem,
  saveChecklistItem,
  setCheckResult,
  startWeeklyCheck,
} from "@/lib/transport.functions";
import { useTransportAudit, useTransportRefresh } from "./use-transport";
import type { transportUi } from "@/i18n/pages/transport";

type Ui = ReturnType<typeof transportUi>;

/** Monday of the current week, as an ISO date. */
function weekStart(): string {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  now.setUTCDate(now.getUTCDate() - day);
  return now.toISOString().slice(0, 10);
}

export function AuditSection({ t }: { t: Ui }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const audit = useTransportAudit(activeId);
  const refresh = useTransportRefresh();
  const [newItem, setNewItem] = useState("");
  const [summary, setSummary] = useState("");

  const saveItem = useServerFn(saveChecklistItem);
  const removeItem = useServerFn(deleteChecklistItem);
  const start = useServerFn(startWeeklyCheck);
  const setResult = useServerFn(setCheckResult);
  const complete = useServerFn(completeWeeklyCheck);

  const run = <T,>(p: Promise<T>) =>
    p.then(() => refresh()).catch((e: Error) => toast.error(e.message));

  const startRun = useMutation({
    mutationFn: () => start({ data: { periodStart: weekStart() } }),
    onSuccess: (res) => {
      setActiveId(res.id);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = audit.data;
  const canEdit = data?.grants.includes("checklist") ?? false;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel icon={ListChecks} title={t.checklist} description={t.checklistBody}>
        {canEdit ? (
          <div className="mb-3 flex gap-2">
            <Input
              value={newItem}
              placeholder={t.item}
              onChange={(e) => setNewItem(e.target.value)}
            />
            <Button
              size="sm"
              disabled={!newItem.trim()}
              onClick={() => {
                void run(saveItem({ data: { label: newItem.trim() } })).then(() =>
                  setNewItem(""),
                );
              }}
            >
              <Plus className="mr-1 size-3.5" />
              {t.add}
            </Button>
          </div>
        ) : null}

        {!data?.items.length ? (
          <EmptyState title={t.none} description={t.checklistBody} />
        ) : (
          <ul className="divide-y divide-border">
            {data.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.scope}
                    {item.required ? ` · ${t.required}` : ""}
                  </p>
                </div>
                {canEdit ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void run(removeItem({ data: { id: item.id } }))}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        icon={CalendarCheck}
        title={t.audit}
        description={t.auditBody}
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => startRun.mutate()}>
              {t.startAudit}
            </Button>
          ) : null
        }
      >
        {!data?.results.length ? (
          <EmptyState title={t.noAudit} description={t.auditBody} />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {data.results.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <p className="text-sm font-medium">{r.item_label}</p>
                    {r.note ? (
                      <p className="text-xs text-muted-foreground">{r.note}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline">{r.outcome}</Badge>
                    {canEdit ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            void run(
                              setResult({ data: { resultId: r.id, outcome: "ok" } }),
                            )
                          }
                        >
                          {t.outcomeOk}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            void run(
                              setResult({ data: { resultId: r.id, outcome: "issue" } }),
                            )
                          }
                        >
                          {t.outcomeIssue}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            void run(
                              setResult({
                                data: { resultId: r.id, outcome: "not_applicable" },
                              }),
                            )
                          }
                        >
                          {t.outcomeNa}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {canEdit && data.activeId ? (
              <div className="mt-4 grid gap-2">
                <Textarea
                  rows={2}
                  placeholder={t.summary}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    void run(
                      complete({
                        data: { checkId: data.activeId as string, summary: summary || null },
                      }),
                    )
                  }
                >
                  {t.completeAudit}
                </Button>
              </div>
            ) : null}
          </>
        )}

        {data?.checks.length ? (
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t.history}</p>
            <ul className="space-y-1">
              {data.checks.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => setActiveId(c.id)}
                  >
                    {c.period_start} · {c.status}
                    {c.ran_by_name ? ` · ${c.ran_by_name}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
