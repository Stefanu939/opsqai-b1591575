// OPSQAI HR — payroll data access + payslip / accounting PDF (server only).
//
// No tax or social contribution is calculated automatically. Every addition
// and deduction is a value HR entered manually; the generated documents state
// that explicitly so nobody mistakes a payslip for a legal tax calculation.

import { hrQuery as q, hrQueryOne as one } from "./db.server";
import type { HrPayrollEntry, HrPayslip, HrSalary } from "./types";

const n = (v: unknown) => Number(v ?? 0);

const mapSalary = (r: HrSalary): HrSalary => ({
  ...r,
  gross_amount: n(r.gross_amount),
  hours_per_week: r.hours_per_week === null ? null : n(r.hours_per_week),
});

export async function listSalaries(companyId: string, employeeId: string): Promise<HrSalary[]> {
  const rows = await q<HrSalary>(
    `SELECT id, employee_id, valid_from::text, gross_amount, currency, period,
            hours_per_week, reason, note, created_by_name, created_at
       FROM public.hr_salaries
      WHERE company_id = $1 AND employee_id = $2
      ORDER BY valid_from DESC, created_at DESC`,
    [companyId, employeeId],
  );
  return rows.map(mapSalary);
}

export async function addSalary(
  companyId: string,
  employeeId: string,
  values: {
    valid_from: string;
    gross_amount: number;
    currency: string;
    period: "month" | "hour" | "year";
    hours_per_week?: number | null;
    reason?: string | null;
    note?: string | null;
  },
  actor: { id: string; name: string },
) {
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_salaries
       (company_id, employee_id, valid_from, gross_amount, currency, period, hours_per_week, reason, note, created_by, created_by_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      companyId,
      employeeId,
      values.valid_from,
      values.gross_amount,
      values.currency,
      values.period,
      values.hours_per_week ?? null,
      values.reason ?? null,
      values.note ?? null,
      actor.id,
      actor.name,
    ],
  );
  return row!.id;
}

export async function deleteSalary(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_salaries WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

export async function listEntries(
  companyId: string,
  employeeId: string,
  periodMonth: string,
): Promise<HrPayrollEntry[]> {
  const rows = await q<HrPayrollEntry>(
    `SELECT id, employee_id, period_month::text, kind, label, amount, note, created_by_name, created_at
       FROM public.hr_payroll_entries
      WHERE company_id = $1 AND employee_id = $2 AND period_month = $3::date
      ORDER BY kind, created_at`,
    [companyId, employeeId, periodMonth],
  );
  return rows.map((r) => ({ ...r, amount: n(r.amount) }));
}

export async function addEntry(
  companyId: string,
  employeeId: string,
  values: {
    period_month: string;
    kind: "addition" | "deduction";
    label: string;
    amount: number;
    note?: string | null;
  },
  actor: { id: string; name: string },
) {
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_payroll_entries
       (company_id, employee_id, period_month, kind, label, amount, note, created_by, created_by_name)
     VALUES ($1,$2,$3::date,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      companyId,
      employeeId,
      values.period_month,
      values.kind,
      values.label,
      values.amount,
      values.note ?? null,
      actor.id,
      actor.name,
    ],
  );
  return row!.id;
}

export async function deleteEntry(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_payroll_entries WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

export async function listPayslips(companyId: string, employeeId?: string, periodMonth?: string) {
  const params: unknown[] = [companyId];
  let where = "p.company_id = $1";
  if (employeeId) {
    params.push(employeeId);
    where += ` AND p.employee_id = $${params.length}`;
  }
  if (periodMonth) {
    params.push(periodMonth);
    where += ` AND p.period_month = $${params.length}::date`;
  }
  const rows = await q<HrPayslip>(
    `SELECT p.id, p.employee_id, e.employee_no,
            NULLIF(concat_ws(' ', e.first_name, e.last_name), '') AS employee_name,
            p.period_month::text, p.gross, p.additions, p.deductions, p.payable,
            p.currency, p.filename, p.created_by_name, p.created_at
       FROM public.hr_payslips p
       LEFT JOIN public.hr_employees e ON e.id = p.employee_id
      WHERE ${where}
      ORDER BY p.period_month DESC, e.employee_no`,
    params,
  );
  return rows.map((r) => ({
    ...r,
    gross: n(r.gross),
    additions: n(r.additions),
    deductions: n(r.deductions),
    payable: n(r.payable),
  }));
}

export async function savePayslip(
  companyId: string,
  employeeId: string,
  values: {
    period_month: string;
    gross: number;
    additions: number;
    deductions: number;
    payable: number;
    currency: string;
    filename: string;
    data: Uint8Array;
  },
  actor: { id: string; name: string },
) {
  const row = await one<{ id: string }>(
    `INSERT INTO public.hr_payslips
       (company_id, employee_id, period_month, gross, additions, deductions, payable, currency, filename, data, created_by, created_by_name)
     VALUES ($1,$2,$3::date,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (company_id, employee_id, period_month) DO UPDATE
       SET gross = EXCLUDED.gross, additions = EXCLUDED.additions, deductions = EXCLUDED.deductions,
           payable = EXCLUDED.payable, currency = EXCLUDED.currency, filename = EXCLUDED.filename,
           data = EXCLUDED.data, created_by_name = EXCLUDED.created_by_name, created_at = now()
     RETURNING id`,
    [
      companyId,
      employeeId,
      values.period_month,
      values.gross,
      values.additions,
      values.deductions,
      values.payable,
      values.currency,
      values.filename,
      Buffer.from(values.data),
      actor.id,
      actor.name,
    ],
  );
  return row!.id;
}

export async function getPayslipFile(companyId: string, id: string) {
  return one<{ filename: string; mime: string; data: Uint8Array | null }>(
    `SELECT filename, mime, data FROM public.hr_payslips WHERE company_id = $1 AND id = $2`,
    [companyId, id],
  );
}

export async function deletePayslip(companyId: string, id: string) {
  await q(`DELETE FROM public.hr_payslips WHERE company_id = $1 AND id = $2`, [companyId, id]);
}

/** The salary that applies at a given month (latest valid_from <= month end). */
export function salaryAt(history: HrSalary[], periodMonth: string): HrSalary | null {
  const monthStart = `${periodMonth.slice(0, 7)}-01`;
  const end = new Date(monthStart);
  end.setMonth(end.getMonth() + 1);
  const cutoff = end.toISOString().slice(0, 10);
  const applicable = history.filter((s) => s.valid_from < cutoff);
  return applicable[0] ?? null;
}

export function monthlyGross(salary: HrSalary | null, weeklyHoursFallback: number): number {
  if (!salary) return 0;
  if (salary.period === "month") return salary.gross_amount;
  if (salary.period === "year") return Math.round((salary.gross_amount / 12) * 100) / 100;
  const hours = salary.hours_per_week ?? weeklyHoursFallback;
  return Math.round(salary.gross_amount * hours * 4.333 * 100) / 100;
}
