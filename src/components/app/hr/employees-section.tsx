// OPSQAI HR — Employees: list, filters, record editing and the Employee 360° view.
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, FileText, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteHrEmployee, exportHrEmployeePdf, exportHrEmployeesCsv } from "@/lib/hr.functions";
import { downloadBase64 } from "@/components/app/transport/download";
import type { EmployeeStatus, HrEmployee, HrEmployeeFilters } from "@/lib/hr/types";
import type { HrUi } from "@/i18n/pages/hr";
import { EmployeeDialog } from "./employee-dialog";
import { useHrEmployee, useHrEmployees, useHrRefresh } from "./use-hr";

const STATUSES: EmployeeStatus[] = [
  "onboarding",
  "active",
  "leave",
  "offboarding",
  "terminated",
];

function statusTone(status: EmployeeStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "default";
  if (status === "terminated") return "destructive";
  if (status === "offboarding") return "outline";
  return "secondary";
}

export function EmployeesSection({ t }: { t: HrUi }) {
  const [filters, setFilters] = useState<HrEmployeeFilters>({});
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HrEmployee | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const query = useHrEmployees(filters);
  const refresh = useHrRefresh();
  const remove = useServerFn(deleteHrEmployee);
  const exportCsv = useServerFn(exportHrEmployeesCsv);

  const refs = query.data?.refs ?? { departments: [], positions: [], locations: [] };
  const grants = query.data?.grants ?? [];
  const country = query.data?.settings.country ?? "generic";
  const employees = useMemo(() => query.data?.employees ?? [], [query.data]);

  if (selected) {
    return (
      <EmployeeDetail
        t={t}
        id={selected}
        onBack={() => setSelected(null)}
        onEdit={(employee) => {
          setEditing(employee);
          setDialogOpen(true);
        }}
      />
    );
  }

  const picker = (
    key: "departmentId" | "positionId" | "locationId",
    label: string,
    options: Array<{ id: string; name: string }>,
  ) => (
    <Select
      value={filters[key] ?? "all"}
      onValueChange={(v) =>
        setFilters((f) => ({ ...f, [key]: v === "all" ? undefined : v }))
      }
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{`${label}: ${t.all}`}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="grid gap-4">
      <Panel
        icon={Users}
        title={t.employeeList}
        actions={
          <div className="flex flex-wrap gap-2">
            {grants.includes("export") ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void exportCsv()
                    .then((res) => downloadBase64(res.filename, res.base64, "text/csv"))
                    .catch((e: Error) => toast.error(e.message))
                }
              >
                <Download className="mr-1.5 size-4" />
                {t.exportCsv}
              </Button>
            ) : null}
            {grants.includes("create") ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <UserPlus className="mr-1.5 size-4" />
                {t.newEmployee}
              </Button>
            ) : null}
          </div>
        }
      >
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setFilters((f) => ({ ...f, search: search.trim() || undefined }));
          }}
        >
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full sm:w-72"
            aria-label={t.search}
          />
          <Button type="submit" size="sm" variant="outline">
            {t.search}
          </Button>
          {picker("departmentId", t.department, refs.departments)}
          {picker("positionId", t.position, refs.positions)}
          {picker("locationId", t.location, refs.locations)}
          <Select
            value={filters.status ?? "all"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, status: v === "all" ? undefined : (v as EmployeeStatus) }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{`${t.status}: ${t.all}`}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t.statuses[s] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </form>
      </Panel>

      {query.isPending ? (
        <Skeleton className="h-72 w-full rounded-lg" />
      ) : query.error ? (
        <EmptyState title={t.none} description={(query.error as Error).message} />
      ) : employees.length === 0 ? (
        <EmptyState icon={Users} title={t.none} description={t.noneBody} />
      ) : (
        <Panel flush>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">{t.employeeId}</th>
                  <th className="px-4 py-2.5">{t.name}</th>
                  <th className="px-4 py-2.5">{t.position}</th>
                  <th className="px-4 py-2.5">{t.department}</th>
                  <th className="px-4 py-2.5">{t.status}</th>
                  <th className="px-4 py-2.5">{t.contract}</th>
                  <th className="px-4 py-2.5">{t.startDate}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs">{employee.employee_no}</td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                        onClick={() => setSelected(employee.id)}
                      >
                        {employee.first_name} {employee.last_name}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {employee.position_name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {employee.department_name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={statusTone(employee.status)}>
                        {t.statuses[employee.status] ?? employee.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {employee.contract_type ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {employee.start_date ? employee.start_date.slice(0, 10) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        {grants.includes("edit") ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={t.edit}
                            onClick={() => {
                              setEditing(employee);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        ) : null}
                        {grants.includes("delete") ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={t.remove}
                            onClick={() =>
                              void remove({ data: { id: employee.id } })
                                .then(() => {
                                  toast.success(t.saved);
                                  void refresh();
                                })
                                .catch((e: Error) => toast.error(e.message))
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <EmployeeDialog
        t={t}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={editing}
        country={country}
        refs={refs}
        onSaved={refresh}
      />
    </div>
  );
}

function EmployeeDetail({
  t,
  id,
  onBack,
  onEdit,
}: {
  t: HrUi;
  id: string;
  onBack: () => void;
  onEdit: (employee: HrEmployee) => void;
}) {
  const query = useHrEmployee(id);
  const exportPdf = useServerFn(exportHrEmployeePdf);

  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) {
    return <EmptyState title={t.none} description={(query.error as Error).message} />;
  }
  const data = query.data;
  if (!data) return <EmptyState title={t.none} />;
  const e = data.employee;

  const field = (label: string, value: string | null) => (
    <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value?.trim() ? value : "—"}</p>
    </div>
  );

  return (
    <div className="grid gap-4">
      <Panel
        icon={Users}
        title={`${e.employee_no} — ${e.first_name} ${e.last_name}`}
        description={[e.position_name, e.department_name, e.location_name]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={onBack}>
              {t.back}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void exportPdf({ data: { id } })
                  .then((res) => downloadBase64(res.filename, res.base64))
                  .catch((err: Error) => toast.error(err.message))
              }
            >
              <FileText className="mr-1.5 size-4" />
              {t.profilePdf}
            </Button>
            {data.grants.includes("edit") ? (
              <Button size="sm" onClick={() => onEdit(e)}>
                <Pencil className="mr-1.5 size-4" />
                {t.edit}
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <Badge variant={statusTone(e.status)}>{t.statuses[e.status] ?? e.status}</Badge>
          <span className="text-xs text-muted-foreground">{t.currentStatus}</span>
        </div>
      </Panel>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
          <TabsTrigger value="activity">{t.activity}</TabsTrigger>
          <TabsTrigger value="tasks">{t.tasks}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3">
          <Panel title={t.personalInformation}>
            <div className="grid gap-2 sm:grid-cols-2">
              {field(t.dateOfBirth, e.date_of_birth?.slice(0, 10) ?? null)}
              {field(t.email, e.email)}
              {field(t.phone, e.phone)}
              {field(t.address, e.address)}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {field(t.contract, e.contract_type)}
              {field(t.employmentType, e.employment_type)}
              {field(t.startDate, e.start_date?.slice(0, 10) ?? null)}
              {field(t.endDate, e.end_date?.slice(0, 10) ?? null)}
            </div>
            {e.notes ? <p className="mt-3 text-sm text-muted-foreground">{e.notes}</p> : null}
          </Panel>
        </TabsContent>

        <TabsContent value="activity" className="mt-3">
          <Panel title={t.timeline}>
            {data.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noTimeline}</p>
            ) : (
              <ol className="grid gap-2">
                {data.events.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-sm"
                  >
                    <p className="text-foreground">{event.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.occurred_at).toLocaleString()}
                      {event.actor ? ` · ${event.actor}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="tasks" className="mt-3">
          <Panel title={t.tasks}>
            {data.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noTasks}</p>
            ) : (
              <ul className="grid gap-2">
                {data.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-sm"
                  >
                    <span className="text-foreground">{task.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.statuses[task.status] ?? task.status}
                      {task.due_date ? ` · ${task.due_date.slice(0, 10)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
