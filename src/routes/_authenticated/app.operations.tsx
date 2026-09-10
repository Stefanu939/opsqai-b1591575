// OPSQAI Core — Operations: incidents & damages, root-cause intelligence,
// corrective / preventive actions and cost analytics. Self-Hosted Core.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart3,
  Download,
  ListChecks,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { ModulePage } from "@/components/app/module-page";
import { Panel } from "@/components/ui/panel";
import { MetricTile } from "@/components/ui/metric-tile";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadBase64 } from "@/components/app/transport/download";
import { IncidentPanel } from "@/components/app/core-ops/incident-panel";
import { useT } from "@/i18n";
import { coreOpsUi } from "@/i18n/pages/core-ops";
import { INCIDENT_KINDS, INCIDENT_STATUSES, type IncidentKind } from "@/lib/core-ops/types";
import {
  deleteCoreIncident,
  exportCoreAnalyticsPdf,
  getCoreOpsBoard,
  saveCoreIncident,
} from "@/lib/core-ops.functions";

export const Route = createFileRoute("/_authenticated/app/operations")({
  head: () => ({
    meta: [
      { title: "Operations — incidents & root cause | OPSQAI" },
      {
        name: "description",
        content:
          "Record incidents and damages, link them to the procedures they violate, run grounded root-cause analysis and track corrective actions.",
      },
      { property: "og:title", content: "Operations — incidents & root cause | OPSQAI" },
      {
        property: "og:description",
        content: "Incidents, procedure links, grounded root causes and corrective actions in OPSQAI Core.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OperationsPage,
});

const emptyForm = {
  id: null as string | null,
  kind: "damage" as IncidentKind,
  title: "",
  description: "",
  occurred_at: new Date().toISOString().slice(0, 16),
  department_id: "",
  location: "",
  cost_amount: "0",
  currency: "EUR",
  lost_minutes: "0",
  frequency_per_month: "1",
  status: "open" as (typeof INCIDENT_STATUSES)[number],
  involved_person: "",
  involved_role: "",
  immediate_cause: "",
};

function OperationsPage() {
  const { lang } = useT();
  const language = lang === "de" || lang === "ro" ? lang : "en";
  const ui = coreOpsUi(language);
  const qc = useQueryClient();

  const load = useServerFn(getCoreOpsBoard);
  const save = useServerFn(saveCoreIncident);
  const remove = useServerFn(deleteCoreIncident);
  const report = useServerFn(exportCoreAnalyticsPdf);

  const [tab, setTab] = useState<"incidents" | "actions" | "analytics">("incidents");
  const [filters, setFilters] = useState<{ search: string; kind: string; status: string; departmentId: string }>({
    search: "",
    kind: "",
    status: "",
    departmentId: "",
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);

  const board = useQuery({
    queryKey: ["core-ops", "board", filters],
    queryFn: () =>
      load({
        data: {
          search: filters.search || null,
          kind: (filters.kind || null) as IncidentKind | null,
          status: (filters.status || null) as (typeof INCIDENT_STATUSES)[number] | null,
          departmentId: filters.departmentId || null,
        },
      }),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["core-ops"] });
  };

  const submit = () => {
    void save({
      data: {
        id: form.id,
        kind: form.kind,
        title: form.title.trim(),
        description: form.description || null,
        occurred_at: new Date(form.occurred_at).toISOString(),
        department_id: form.department_id || null,
        location: form.location || null,
        cost_amount: Number(form.cost_amount) || 0,
        currency: (form.currency || "EUR").toUpperCase().slice(0, 3),
        lost_minutes: Math.round(Number(form.lost_minutes) || 0),
        frequency_per_month: Number(form.frequency_per_month) || 0,
        status: form.status,
        involved_person: form.involved_person || null,
        involved_role: form.involved_role || null,
        immediate_cause: form.immediate_cause || null,
      },
    })
      .then((r) => {
        toast.success(ui.saved);
        setOpen(false);
        setForm(emptyForm);
        setSelected(r.id);
        refresh();
      })
      .catch((e: Error) => toast.error(e.message));
  };

  if (board.isPending) {
    return (
      <ModulePage eyebrow="OPSQAI Core" title={ui.title} description={ui.description}>
        <Skeleton className="h-96 w-full rounded-lg" />
      </ModulePage>
    );
  }
  if (board.error) {
    return (
      <ModulePage eyebrow="OPSQAI Core" title={ui.title} description={ui.description}>
        <EmptyState title={ui.title} description={(board.error as Error).message} />
      </ModulePage>
    );
  }

  const data = board.data!;
  const costs = data.grants.includes("costs");
  const money = (value: number) =>
    `${new Intl.NumberFormat(language === "en" ? "en-GB" : language === "ro" ? "ro-RO" : "de-DE").format(value)} ${data.analytics.currency}`;

  return (
    <ModulePage
      eyebrow="OPSQAI Core"
      title={ui.title}
      description={ui.description}
      actions={
        <div className="flex flex-wrap gap-2">
          {data.grants.includes("export") && (
            <Button
              variant="outline"
              onClick={() =>
                void report()
                  .then((r) => downloadBase64(r.filename, r.base64))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              <Download className="mr-1.5 size-4" /> {ui.reportPdf}
            </Button>
          )}
          {data.grants.includes("create") && (
            <Button
              onClick={() => {
                setForm(emptyForm);
                setOpen(true);
              }}
            >
              <Plus className="mr-1.5 size-4" /> {ui.newIncident}
            </Button>
          )}
        </div>
      }
      tabs={
        <SegmentedTabs
          options={[
            { value: "incidents", label: ui.tabIncidents, count: data.incidents.length },
            { value: "actions", label: ui.tabActions, count: data.openActions.length },
            { value: "analytics", label: ui.tabAnalytics },
          ]}
          value={tab}
          onChange={setTab}
        />
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile label={ui.incidents} value={data.analytics.totals.incidents} icon={AlertTriangle} />
          {costs && (
            <MetricTile
              label={ui.annualImpact}
              value={money(data.analytics.totals.annualImpact)}
              hint={`${ui.directCost}: ${money(data.analytics.totals.cost)}`}
              tone="warning"
            />
          )}
          <MetricTile
            label={ui.openActions}
            value={data.analytics.totals.openActions}
            hint={`${data.analytics.totals.overdueActions} ${ui.overdue}`}
            tone={data.analytics.totals.overdueActions > 0 ? "danger" : "default"}
            icon={ListChecks}
          />
          <MetricTile
            label={ui.openGaps}
            value={data.analytics.totals.openGaps}
            hint={
              data.analytics.totals.answerQuality === null
                ? undefined
                : `${ui.answerQuality}: ${data.analytics.totals.answerQuality}%`
            }
            icon={ShieldAlert}
          />
        </div>

        {data.scopedToDepartment && (
          <p className="text-xs text-muted-foreground">{ui.departmentScoped}</p>
        )}

        {tab === "incidents" && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Panel
              icon={AlertTriangle}
              title={ui.tabIncidents}
              actions={
                <Input
                  className="h-8 w-40"
                  placeholder={ui.search}
                  value={filters.search}
                  onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                />
              }
            >
              <div className="mb-3 flex flex-wrap gap-2">
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  value={filters.kind}
                  onChange={(e) => setFilters((p) => ({ ...p, kind: e.target.value }))}
                >
                  <option value="">{ui.allTypes}</option>
                  {INCIDENT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {ui.kinds[k]}
                    </option>
                  ))}
                </select>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  value={filters.status}
                  onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="">{ui.allStatus}</option>
                  {INCIDENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ui.statuses[s]}
                    </option>
                  ))}
                </select>
                {!data.scopedToDepartment && (
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    value={filters.departmentId}
                    onChange={(e) => setFilters((p) => ({ ...p, departmentId: e.target.value }))}
                  >
                    <option value="">{ui.allDepartments}</option>
                    {data.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {data.incidents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{ui.noData}</p>
              ) : (
                <ul className="grid max-h-[36rem] gap-2 overflow-y-auto pr-1">
                  {data.incidents.map((i) => (
                    <li
                      key={i.id}
                      className={`rounded-lg border p-3 ${selected === i.id ? "border-primary bg-primary/5" : "border-border/60 bg-card/50"}`}
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => setSelected(i.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{ui.kinds[i.kind]}</Badge>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {i.ref ? `${i.ref} · ` : ""}
                            {i.title}
                          </span>
                          <Badge>{ui.statuses[i.status]}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{new Date(i.occurred_at).toLocaleDateString()}</span>
                          {i.department_name && <span>{i.department_name}</span>}
                          {costs && i.cost_amount > 0 && <span>{money(i.cost_amount)}</span>}
                          {(i.open_actions ?? 0) > 0 && (
                            <span>
                              {i.open_actions} {ui.openActions.toLowerCase()}
                            </span>
                          )}
                        </div>
                      </button>
                      <div className="mt-2 flex gap-1.5">
                        {data.grants.includes("edit") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            onClick={() => {
                              setForm({
                                id: i.id,
                                kind: i.kind,
                                title: i.title,
                                description: i.description ?? "",
                                occurred_at: new Date(i.occurred_at).toISOString().slice(0, 16),
                                department_id: i.department_id ?? "",
                                location: i.location ?? "",
                                cost_amount: String(i.cost_amount),
                                currency: i.currency,
                                lost_minutes: String(i.lost_minutes),
                                frequency_per_month: String(i.frequency_per_month),
                                status: i.status,
                                involved_person: i.involved_person ?? "",
                                involved_role: i.involved_role ?? "",
                                immediate_cause: i.immediate_cause ?? "",
                              });
                              setOpen(true);
                            }}
                          >
                            {ui.editIncident}
                          </Button>
                        )}
                        {data.grants.includes("delete") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => {
                              if (!window.confirm(ui.confirmDelete)) return;
                              void remove({ data: { id: i.id } })
                                .then(() => {
                                  if (selected === i.id) setSelected(null);
                                  refresh();
                                })
                                .catch((e: Error) => toast.error(e.message));
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {selected ? (
              <IncidentPanel id={selected} ui={ui} lang={language} />
            ) : (
              <EmptyState title={ui.tabIncidents} description={ui.relationsHint} />
            )}
          </div>
        )}

        {tab === "actions" && (
          <Panel icon={ListChecks} title={ui.openActions}>
            {data.openActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{ui.noActions}</p>
            ) : (
              <ul className="grid gap-2">
                {data.openActions.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 p-2.5 text-sm">
                    <Badge variant="outline">
                      {a.kind === "corrective" ? ui.kindCorrective : ui.kindPreventive}
                    </Badge>
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left hover:underline"
                      onClick={() => {
                        setSelected(a.incident_id);
                        setTab("incidents");
                      }}
                    >
                      {a.title} — {a.incident_ref ?? a.incident_title}
                    </button>
                    {a.owner_name && <span className="text-xs text-muted-foreground">{a.owner_name}</span>}
                    {a.due_date && (
                      <Badge variant={new Date(a.due_date) < new Date() ? "destructive" : "secondary"}>
                        {ui.due}: {a.due_date.slice(0, 10)}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "analytics" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel icon={BarChart3} title={ui.byDepartment}>
              <AnalyticsList
                rows={data.analytics.byDepartment}
                money={costs ? money : undefined}
                empty={ui.noData}
              />
            </Panel>
            <Panel icon={BarChart3} title={ui.byType}>
              <AnalyticsList
                rows={data.analytics.byKind.map((r) => ({ ...r, label: ui.kinds[r.label] ?? r.label }))}
                money={costs ? money : undefined}
                empty={ui.noData}
              />
            </Panel>
            <Panel icon={BarChart3} title={ui.topRootCauses}>
              <AnalyticsList rows={data.analytics.topRootCauses} money={costs ? money : undefined} empty={ui.noData} />
            </Panel>
            <Panel icon={BarChart3} title={ui.topViolated}>
              <AnalyticsList
                rows={data.analytics.topViolatedSops.map((r) => ({ ...r, cost: 0 }))}
                empty={ui.noData}
              />
            </Panel>
            <Panel icon={BarChart3} title={ui.trend} className="lg:col-span-2">
              <AnalyticsList
                rows={data.analytics.trend.map((r) => ({ label: r.month, incidents: r.incidents, cost: r.cost }))}
                money={costs ? money : undefined}
                empty={ui.noData}
              />
            </Panel>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? ui.editIncident : ui.newIncident}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>{ui.incidentTitle}</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>{ui.descriptionField}</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{ui.type}</Label>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={form.kind}
                onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value as IncidentKind }))}
              >
                {INCIDENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ui.kinds[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>{ui.status}</Label>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({ ...p, status: e.target.value as (typeof INCIDENT_STATUSES)[number] }))
                }
              >
                {INCIDENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ui.statuses[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>{ui.occurredAt}</Label>
              <Input
                type="datetime-local"
                value={form.occurred_at}
                onChange={(e) => setForm((p) => ({ ...p, occurred_at: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{ui.department}</Label>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={form.department_id}
                onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value }))}
              >
                <option value="">—</option>
                {data.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>{ui.location}</Label>
              <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>{ui.frequency}</Label>
              <Input
                type="number"
                step="0.5"
                value={form.frequency_per_month}
                onChange={(e) => setForm((p) => ({ ...p, frequency_per_month: e.target.value }))}
              />
            </div>
            {costs && (
              <>
                <div className="grid gap-1.5">
                  <Label>{ui.cost}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.cost_amount}
                    onChange={(e) => setForm((p) => ({ ...p, cost_amount: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>{ui.currency}</Label>
                  <Input
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                  />
                </div>
              </>
            )}
            <div className="grid gap-1.5">
              <Label>{ui.downtime}</Label>
              <Input
                type="number"
                value={form.lost_minutes}
                onChange={(e) => setForm((p) => ({ ...p, lost_minutes: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{ui.involvedPerson}</Label>
              <Input
                value={form.involved_person}
                onChange={(e) => setForm((p) => ({ ...p, involved_person: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{ui.involvedRole}</Label>
              <Input
                value={form.involved_role}
                onChange={(e) => setForm((p) => ({ ...p, involved_role: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>{ui.immediateCause}</Label>
              <Textarea
                rows={2}
                value={form.immediate_cause}
                onChange={(e) => setForm((p) => ({ ...p, immediate_cause: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {ui.cancel}
            </Button>
            <Button onClick={submit} disabled={form.title.trim().length < 3}>
              {ui.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModulePage>
  );
}

function AnalyticsList({
  rows,
  money,
  empty,
}: {
  rows: Array<{ label: string; incidents: number; cost: number }>;
  money?: (value: number) => string;
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.incidents), 1);
  return (
    <ul className="grid gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid gap-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{r.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {r.incidents}
              {money && r.cost > 0 ? ` · ${money(r.cost)}` : ""}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{ width: `${Math.max((r.incidents / max) * 100, 4)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
