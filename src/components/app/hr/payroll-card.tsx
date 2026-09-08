// OPSQAI HR — payroll inside the employee file: salary history, monthly
// additions / deductions, payslip PDFs and the accounting export.
// Everything here is hidden unless the account has the payroll right.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, FileText, Lock, Plus, Trash2, Wallet } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  deleteHrPayrollEntry,
  deleteHrSalary,
  downloadHrPayslip,
  exportHrPayrollPdf,
  generateHrPayslip,
  saveHrPayrollEntry,
  saveHrSalary,
} from "@/lib/hr-payroll.functions";
import { downloadBase64 } from "@/components/app/transport/download";
import type { HrPayrollUi } from "@/i18n/pages/hr-payroll";
import { useHrPayroll, useHrPayrollRefresh } from "./use-hr-payroll";
import { Field, StatCell, selectCls } from "./shared";

const thisMonth = () => new Date().toISOString().slice(0, 7);

export function PayrollCard({
  employeeId,
  t,
  hasRight,
}: {
  employeeId: string;
  t: HrPayrollUi;
  hasRight: boolean;
}) {
  const [period, setPeriod] = useState(thisMonth());
  const query = useHrPayroll(employeeId, period, hasRight);
  const refresh = useHrPayrollRefresh();
  const addSalary = useServerFn(saveHrSalary);
  const removeSalary = useServerFn(deleteHrSalary);
  const addEntry = useServerFn(saveHrPayrollEntry);
  const removeEntry = useServerFn(deleteHrPayrollEntry);
  const makePayslip = useServerFn(generateHrPayslip);
  const getPayslip = useServerFn(downloadHrPayslip);
  const exportMonth = useServerFn(exportHrPayrollPdf);

  const [salaryOpen, setSalaryOpen] = useState(false);
  const [entryKind, setEntryKind] = useState<"addition" | "deduction" | null>(null);
  const [salary, setSalary] = useState({
    valid_from: `${thisMonth()}-01`,
    gross_amount: "",
    currency: "EUR",
    period: "month" as "month" | "hour" | "year",
    hours_per_week: "",
    reason: "",
  });
  const [entry, setEntry] = useState({ label: "", amount: "", note: "" });

  if (!hasRight) {
    return (
      <Panel icon={Lock} title={t.payroll}>
        <p className="text-sm text-muted-foreground">{t.noRight}</p>
      </Panel>
    );
  }
  if (query.isPending) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (query.error) return <Panel title={t.payroll}><p className="text-sm text-destructive">{(query.error as Error).message}</p></Panel>;
  const data = query.data!;
  const cur = data.currency;
  const money = (v: number) => `${v.toFixed(2)} ${cur}`;

  const fail = (e: Error) => toast.error(e.message);

  return (
    <div className="grid gap-4">
      <Panel
        icon={Wallet}
        title={t.payroll}
        description={t.payrollHint}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input type="month" className="w-40" value={period} onChange={(e) => setPeriod(e.target.value || thisMonth())} />
            {data.canEdit ? (
              <Button size="sm" onClick={() => setSalaryOpen(true)}>
                <Plus className="mr-1.5 size-4" /> {t.addSalary}
              </Button>
            ) : null}
            {data.canEdit ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void makePayslip({ data: { employeeId, period } })
                    .then((r) => {
                      downloadBase64(r.filename, r.base64, r.mime);
                      toast.success(t.payslip);
                      void refresh();
                    })
                    .catch(fail)
                }
              >
                <FileText className="mr-1.5 size-4" /> {t.generatePayslip}
              </Button>
            ) : null}
            {data.canExport ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  void exportMonth({ data: { period } })
                    .then((r) => downloadBase64(r.filename, r.base64, r.mime))
                    .catch(fail)
                }
              >
                <Download className="mr-1.5 size-4" /> {t.accountingExport}
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCell label={t.gross} value={money(data.totals.gross)} />
          <StatCell label={t.additions} value={money(data.totals.additions)} />
          <StatCell label={t.deductions} value={money(data.totals.deductions)} />
          <StatCell label={t.payable} value={money(data.totals.payable)} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t.manualOnly}</p>

        <div className="mt-4 grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{`${t.additions} / ${t.deductions}`} · {period}</span>
            {data.canEdit ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setEntryKind("addition")}>
                  <Plus className="mr-1 size-3.5" /> {t.addAddition}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEntryKind("deduction")}>
                  <Plus className="mr-1 size-3.5" /> {t.addDeduction}
                </Button>
              </>
            ) : null}
          </div>
          {data.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noEntries}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                  <Badge variant={e.kind === "addition" ? "default" : "secondary"}>
                    {e.kind === "addition" ? t.additions : t.deductions}
                  </Badge>
                  <span className="flex-1 truncate">{e.label}</span>
                  <span className="tabular-nums">{money(e.amount)}</span>
                  {data.canEdit ? (
                    <Button size="sm" variant="ghost" onClick={() => void removeEntry({ data: { id: e.id } }).then(() => void refresh()).catch(fail)}>
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel title={t.salaryHistory}>
        {data.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noSalary}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.history.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="w-28 tabular-nums text-muted-foreground">{s.valid_from.slice(0, 10)}</span>
                <span className="tabular-nums font-medium">
                  {s.gross_amount.toFixed(2)} {s.currency} /{" "}
                  {s.period === "month" ? t.perMonth : s.period === "hour" ? t.perHour : t.perYear}
                </span>
                {s.hours_per_week ? <span className="text-xs text-muted-foreground">{s.hours_per_week} h</span> : null}
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {[s.reason, s.created_by_name].filter(Boolean).join(" · ")}
                </span>
                {data.canEdit ? (
                  <Button size="sm" variant="ghost" onClick={() => void removeSalary({ data: { id: s.id } }).then(() => void refresh()).catch(fail)}>
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t.payslips}>
        {data.payslips.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noPayslips}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.payslips.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="w-24 tabular-nums text-muted-foreground">{p.period_month.slice(0, 7)}</span>
                <span className="flex-1 truncate">{p.filename}</span>
                <span className="tabular-nums">{p.payable.toFixed(2)} {p.currency}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void getPayslip({ data: { id: p.id } })
                      .then((r) => downloadBase64(r.filename, r.base64, r.mime))
                      .catch(fail)
                  }
                >
                  <Download className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Record a salary */}
      <Dialog open={salaryOpen} onOpenChange={setSalaryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.addSalary}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.validFrom}>
              <Input type="date" value={salary.valid_from} onChange={(e) => setSalary({ ...salary, valid_from: e.target.value })} />
            </Field>
            <Field label={t.amount}>
              <Input type="number" step="0.01" value={salary.gross_amount} onChange={(e) => setSalary({ ...salary, gross_amount: e.target.value })} />
            </Field>
            <Field label={t.currency}>
              <select className={selectCls} value={salary.currency} onChange={(e) => setSalary({ ...salary, currency: e.target.value })}>
                {["EUR", "RON", "USD", "CHF", "GBP"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label={t.per}>
              <select
                className={selectCls}
                value={salary.period}
                onChange={(e) => setSalary({ ...salary, period: e.target.value as "month" | "hour" | "year" })}
              >
                <option value="month">{t.perMonth}</option>
                <option value="hour">{t.perHour}</option>
                <option value="year">{t.perYear}</option>
              </select>
            </Field>
            <Field label={t.hoursPerWeek}>
              <Input type="number" step="0.5" value={salary.hours_per_week} onChange={(e) => setSalary({ ...salary, hours_per_week: e.target.value })} />
            </Field>
            <Field label={t.reason}>
              <Input value={salary.reason} onChange={(e) => setSalary({ ...salary, reason: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSalaryOpen(false)}>{t.cancel}</Button>
            <Button
              disabled={!salary.gross_amount.trim() || !salary.valid_from}
              onClick={() =>
                void addSalary({
                  data: {
                    employeeId,
                    valid_from: salary.valid_from,
                    gross_amount: Number(salary.gross_amount),
                    currency: salary.currency,
                    period: salary.period,
                    hours_per_week: salary.hours_per_week ? Number(salary.hours_per_week) : null,
                    reason: salary.reason.trim() || null,
                  },
                })
                  .then(() => {
                    toast.success(t.saved);
                    setSalaryOpen(false);
                    void refresh();
                  })
                  .catch(fail)
              }
            >
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Monthly addition / deduction */}
      <Dialog open={entryKind !== null} onOpenChange={(o) => !o && setEntryKind(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{entryKind === "deduction" ? t.addDeduction : t.addAddition} · {period}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label={t.label}>
              <Input value={entry.label} onChange={(e) => setEntry({ ...entry, label: e.target.value })} />
            </Field>
            <Field label={t.amount}>
              <Input type="number" step="0.01" value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} />
            </Field>
            <Field label={t.note}>
              <Input value={entry.note} onChange={(e) => setEntry({ ...entry, note: e.target.value })} />
            </Field>
            <p className="text-xs text-muted-foreground">{t.manualOnly}</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEntryKind(null)}>{t.cancel}</Button>
            <Button
              disabled={!entry.label.trim() || !entry.amount.trim()}
              onClick={() =>
                void addEntry({
                  data: {
                    employeeId,
                    period,
                    kind: entryKind ?? "addition",
                    label: entry.label.trim(),
                    amount: Number(entry.amount),
                    note: entry.note.trim() || null,
                  },
                })
                  .then(() => {
                    toast.success(t.saved);
                    setEntryKind(null);
                    setEntry({ label: "", amount: "", note: "" });
                    void refresh();
                  })
                  .catch(fail)
              }
            >
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
