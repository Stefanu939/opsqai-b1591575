// Periodic audit: an editable checklist, the run for the current period, a
// schedule with missed-period visibility, per-issue escalation and a PDF report.
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarCheck,
  Download,
  FileWarning,
  ListChecks,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  completeWeeklyCheck,
  deleteChecklistItem,
  escalateCheckResult,
  renderAuditReportBase64,
  saveChecklistItem,
  saveTransportSettings,
  seedTransportChecklist,
  setCheckResult,
  startWeeklyCheck,
} from "@/lib/transport.functions";
import { useTransportAudit, useTransportRefresh } from "./use-transport";
import { downloadBase64 } from "./download";
import type { transportUi } from "@/i18n/pages/transport";

type Ui = ReturnType<typeof transportUi>;
type Cadence = "manual" | "weekly" | "biweekly" | "monthly";

const DAY = 86_400_000;

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Monday of the week containing `date` (UTC). */
function mondayOf(date: Date): Date {
  const d = new Date(date.getTime());
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Start of the period that contains today, for the configured cadence. */
function currentPeriodStart(cadence: Cadence): string {
  const now = new Date();
  if (cadence === "monthly") {
    return iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  }
  const monday = mondayOf(now);
  if (cadence !== "biweekly") return iso(monday);
  const anchor = mondayOf(new Date(Date.UTC(now.getUTCFullYear(), 0, 4)));
  const weeks = Math.round((monday.getTime() - anchor.getTime()) / (7 * DAY));
  if (weeks % 2 !== 0) monday.setUTCDate(monday.getUTCDate() - 7);
  return iso(monday);
}

function dueFor(periodStart: string, cadence: Cadence): string | null {
  if (cadence === "manual") return null;
  const start = new Date(`${periodStart}T00:00:00.000Z`);
  if (cadence === "monthly") {
    return iso(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)));
  }
  return iso(new Date(start.getTime() + (cadence === "biweekly" ? 13 : 6) * DAY));
}

/** Expected period starts (most recent first) that have no completed run. */
function missedPeriods(
  cadence: Cadence,
  done: ReadonlySet<string>,
  lookback = 6,
): string[] {
  if (cadence === "manual") return [];
  const out: string[] = [];
  const current = currentPeriodStart(cadence);
  let cursor = new Date(`${current}T00:00:00.000Z`);
  for (let i = 0; i < lookback; i += 1) {
    if (cadence === "monthly") {
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - 1, 1));
    } else {
      cursor = new Date(cursor.getTime() - (cadence === "biweekly" ? 14 : 7) * DAY);
    }
    const key = iso(cursor);
    if (!done.has(key)) out.push(key);
  }
  return out;
}

function day(value: string | null | undefined): string {
  if (!value) return "—";
  return String(value).slice(0, 10);
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
  const seed = useServerFn(seedTransportChecklist);
  const escalate = useServerFn(escalateCheckResult);
  const report = useServerFn(renderAuditReportBase64);
  const saveSettings = useServerFn(saveTransportSettings);

  const run = <T,>(p: Promise<T>) =>
    p.then(() => refresh()).catch((e: Error) => toast.error(e.message));

  const data = audit.data;
  const cadence = (data?.cadence ?? "manual") as Cadence;
  const canEdit = data?.grants.includes("checklist") ?? false;
  const canExport = data?.grants.includes("export") ?? false;
  const canSchedule = data?.grants.includes("settings") ?? false;

  const period = currentPeriodStart(cadence);
  const activeCheck = data?.checks.find((c) => c.id === data.activeId) ?? null;
  const currentRun = data?.checks.find((c) => day(c.period_start) === period) ?? null;

  const missed = useMemo(() => {
    const done = new Set(
      (data?.checks ?? [])
        .filter((c) => c.status === "completed")
        .map((c) => day(c.period_start)),
    );
    return missedPeriods(cadence, done);
  }, [cadence, data?.checks]);

  const startRun = useMutation({
    mutationFn: () =>
      start({ data: { periodStart: period, dueOn: dueFor(period, cadence) } }),
    onSuccess: (res) => {
      setActiveId(res.id);
      refresh();
      toast.success(t.startAudit);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadReport = async () => {
    if (!data?.activeId) return;
    try {
      const res = await report({ data: { checkId: data.activeId } });
      downloadBase64(res.filename, res.base64);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const noChecklist = !data?.items.length;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        icon={ListChecks}
        title={t.checklist}
        description={t.checklistBody}
        actions={
          canEdit && noChecklist ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void run(seed()).then(() => toast.success(t.seedChecklist))
              }
            >
              {t.seedChecklist}
            </Button>
          ) : null
        }
      >
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

        {noChecklist ? (
          <EmptyState title={t.none} description={t.checklistBody} />
        ) : (
          <ul className="divide-y divide-border">
            {data!.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.hint ? `${item.hint} · ` : ""}
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

        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {t.auditScheduleLabel}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={cadence}
              disabled={!canSchedule}
              onValueChange={(value) =>
                void run(saveSettings({ data: { auditCadence: value as Cadence } }))
              }
            >
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">{t.cadenceManual}</SelectItem>
                <SelectItem value="weekly">{t.cadenceWeekly}</SelectItem>
                <SelectItem value="biweekly">{t.cadenceBiweekly}</SelectItem>
                <SelectItem value="monthly">{t.cadenceMonthly}</SelectItem>
              </SelectContent>
            </Select>
            {cadence === "manual" ? null : (
              <Badge variant="outline" className="text-xs">
                {t.auditDue}: {day(dueFor(period, cadence))}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {missed.length ? (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3.5" />
                {t.missedAudits}: {missed.join(", ")}
              </span>
            ) : (
              t.missedAuditsNone
            )}
          </p>
        </div>
      </Panel>

      <Panel
        icon={CalendarCheck}
        title={t.audit}
        description={t.auditBody}
        actions={
          <div className="flex items-center gap-2">
            {canExport && data?.activeId ? (
              <Button size="sm" variant="outline" onClick={() => void downloadReport()}>
                <Download className="mr-1 size-3.5" />
                {t.exportReport}
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                size="sm"
                disabled={startRun.isPending}
                onClick={() => {
                  if (currentRun) {
                    setActiveId(currentRun.id);
                    return;
                  }
                  startRun.mutate();
                }}
              >
                {t.startAudit}
              </Button>
            ) : null}
          </div>
        }
      >
        {!data?.results.length ? (
          <EmptyState
            title={currentRun ? t.auditNotStarted : t.noAudit}
            description={noChecklist ? t.checklistBody : t.auditBody}
          />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{day(activeCheck?.period_start)}</Badge>
              <span>{activeCheck?.status ?? ""}</span>
              {activeCheck?.due_on ? (
                <span>
                  {t.auditDue}: {day(activeCheck.due_on)}
                </span>
              ) : null}
              {activeCheck?.ran_by_name ? <span>· {activeCheck.ran_by_name}</span> : null}
            </div>

            <ul className="divide-y divide-border">
              {data.results.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.item_label}</p>
                    {r.note ? (
                      <p className="text-xs text-muted-foreground">{r.note}</p>
                    ) : null}
                    {r.incident_id || r.request_id ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.incident_id ? t.linkedIncident : ""}
                        {r.incident_id && r.request_id ? " · " : ""}
                        {r.request_id ? t.linkedRequest : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
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
                        {r.outcome === "issue" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!!r.incident_id}
                              onClick={() =>
                                void run(
                                  escalate({
                                    data: { resultId: r.id, kind: "incident" },
                                  }),
                                )
                              }
                            >
                              <FileWarning className="mr-1 size-3.5" />
                              {t.raiseIncident}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!!r.request_id}
                              onClick={() =>
                                void run(
                                  escalate({
                                    data: { resultId: r.id, kind: "request" },
                                  }),
                                )
                              }
                            >
                              <Send className="mr-1 size-3.5" />
                              {t.raiseRequest}
                            </Button>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {canEdit && data.activeId && activeCheck?.status === "in_progress" ? (
              <div className="mt-4 grid gap-2">
                <Textarea
                  rows={2}
                  placeholder={t.summary}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      void run(
                        complete({
                          data: {
                            checkId: data.activeId as string,
                            summary: summary || null,
                          },
                        }),
                      ).then(() => setSummary(""))
                    }
                  >
                    {t.completeAudit}
                  </Button>
                </div>
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
                    className={`text-xs underline-offset-2 hover:underline ${
                      c.id === data.activeId ? "text-foreground" : "text-muted-foreground"
                    }`}
                    onClick={() => setActiveId(c.id)}
                  >
                    {day(c.period_start)} · {c.status}
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
